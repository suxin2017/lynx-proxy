use std::net::SocketAddr;
use std::path::{Path, PathBuf};

use anyhow::{Result, anyhow};
use serde::{Deserialize, Serialize};
use tokio::fs;

use super::executor::{adb_output_message, ensure_success, run_adb};
use super::types::{EnableProxyPayload, ProxyMode, ProxyState};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PersistedProxyStateFile {
    serial: String,
    backup_http_proxy: String,
    mode: ProxyMode,
    port: u16,
}

fn proxy_state_dir(data_root: &Path) -> PathBuf {
    data_root.join("adb").join("proxy-state")
}

fn proxy_state_path(data_root: &Path, serial: &str) -> PathBuf {
    let safe: String = serial
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect();
    proxy_state_dir(data_root).join(format!("{safe}.json"))
}

async fn load_persisted(data_root: &Path, serial: &str) -> Option<PersistedProxyStateFile> {
    let path = proxy_state_path(data_root, serial);
    let text = fs::read_to_string(path).await.ok()?;
    serde_json::from_str(&text).ok()
}

async fn save_persisted(data_root: &Path, state: &PersistedProxyStateFile) -> Result<()> {
    let dir = proxy_state_dir(data_root);
    fs::create_dir_all(&dir).await?;
    let path = proxy_state_path(data_root, &state.serial);
    let json = serde_json::to_string_pretty(state)?;
    fs::write(path, json).await?;
    Ok(())
}

async fn remove_persisted(data_root: &Path, serial: &str) -> Result<()> {
    let path = proxy_state_path(data_root, serial);
    if path.exists() {
        fs::remove_file(path).await?;
    }
    Ok(())
}

pub async fn get_http_proxy(adb_path: &Path, serial: &str) -> Result<Option<String>> {
    let output = run_adb(adb_path, Some(serial), &["shell", "settings", "get", "global", "http_proxy"]).await?;
    ensure_success(&output, "get http_proxy")?;
    let value = adb_output_message(&output).trim().to_string();
    if value.is_empty() || value == "null" {
        Ok(None)
    } else {
        Ok(Some(value))
    }
}

pub async fn set_http_proxy(adb_path: &Path, serial: &str, value: &str) -> Result<()> {
    let output = run_adb(
        adb_path,
        Some(serial),
        &["shell", "settings", "put", "global", "http_proxy", value],
    )
    .await?;
    ensure_success(&output, "set http_proxy")?;
    Ok(())
}

pub async fn setup_reverse(adb_path: &Path, serial: &str, port: u16) -> Result<()> {
    let spec = format!("tcp:{port}");
    let output = run_adb(adb_path, Some(serial), &["reverse", &spec, &spec]).await?;
    ensure_success(&output, "adb reverse")?;
    Ok(())
}

pub async fn remove_reverse(adb_path: &Path, serial: &str, port: u16) -> Result<()> {
    let spec = format!("tcp:{port}");
    let output = run_adb(adb_path, Some(serial), &["reverse", "--remove", &spec]).await?;
    if !output.status.success() {
        tracing::debug!("adb reverse --remove ignored: {}", adb_output_message(&output));
    }
    Ok(())
}

pub async fn list_reverse(adb_path: &Path, serial: &str, port: u16) -> bool {
    let output = run_adb(adb_path, Some(serial), &["reverse", "--list"]).await;
    let Ok(output) = output else {
        return false;
    };
    let text = adb_output_message(&output);
    let needle = format!("tcp:{port}");
    text.contains(&needle)
}

pub fn pick_lan_host(access_addrs: &[SocketAddr], override_host: Option<&str>) -> Result<String> {
    if let Some(host) = override_host {
        let host = host.trim();
        if host.is_empty() {
            return Err(anyhow!("host must not be empty"));
        }
        return Ok(strip_port_from_host(host));
    }
    for addr in access_addrs {
        let ip = addr.ip();
        if ip.is_loopback() {
            continue;
        }
        return Ok(ip.to_string());
    }
    Err(anyhow!(
        "no LAN address available; use USB reverse mode or restart without --local-only"
    ))
}

fn strip_port_from_host(host: &str) -> String {
    if host.starts_with('[') {
        if let Some(end) = host.find(']') {
            return host[1..end].to_string();
        }
    }
    host.split(':').next().unwrap_or(host).to_string()
}

pub fn proxy_host_port(mode: ProxyMode, host: &str, port: u16) -> String {
    match mode {
        ProxyMode::Lan => format!("{host}:{port}"),
        ProxyMode::UsbReverse => format!("127.0.0.1:{port}"),
    }
}

pub async fn get_proxy_state(
    adb_path: &Path,
    data_root: &Path,
    serial: &str,
) -> Result<ProxyState> {
    let current = get_http_proxy(adb_path, serial).await?;
    let persisted = load_persisted(data_root, serial).await;
    let port = persisted.as_ref().map(|p| p.port).unwrap_or(7788);
    let reverse_active = list_reverse(adb_path, serial, port).await;
    Ok(ProxyState {
        serial: serial.to_string(),
        current_http_proxy: current,
        lynx_managed: persisted.is_some(),
        mode: persisted.as_ref().map(|p| p.mode),
        reverse_active,
        backup_http_proxy: persisted.as_ref().and_then(|p| {
            if p.backup_http_proxy == "null" {
                None
            } else {
                Some(p.backup_http_proxy.clone())
            }
        }),
    })
}

pub async fn enable_proxy(
    adb_path: &Path,
    data_root: &Path,
    access_addrs: &[SocketAddr],
    local_only: bool,
    payload: EnableProxyPayload,
) -> Result<ProxyState> {
    if payload.mode == ProxyMode::Lan && local_only {
        return Err(anyhow!(
            "LAN proxy mode is unavailable while Lynx runs with --local-only; use USB reverse mode"
        ));
    }

    let port = payload.port.unwrap_or_else(|| {
        access_addrs
            .first()
            .map(|a| a.port())
            .unwrap_or(7788)
    });

    if load_persisted(data_root, &payload.serial).await.is_some() {
        return Err(anyhow!("proxy already enabled for this device; disable first"));
    }

    let backup = get_http_proxy(adb_path, &payload.serial).await?;
    let backup_str = backup.as_deref().unwrap_or("null").to_string();

    let host = match payload.mode {
        ProxyMode::Lan => pick_lan_host(access_addrs, payload.host.as_deref())?,
        ProxyMode::UsbReverse => {
            setup_reverse(adb_path, &payload.serial, port).await?;
            "127.0.0.1".to_string()
        }
    };

    let proxy_value = proxy_host_port(payload.mode, &host, port);
    set_http_proxy(adb_path, &payload.serial, &proxy_value).await?;

    save_persisted(
        data_root,
        &PersistedProxyStateFile {
            serial: payload.serial.clone(),
            backup_http_proxy: backup_str,
            mode: payload.mode,
            port,
        },
    )
    .await?;

    get_proxy_state(adb_path, data_root, &payload.serial).await
}

pub async fn disable_proxy(adb_path: &Path, data_root: &Path, serial: &str) -> Result<ProxyState> {
    let persisted = load_persisted(data_root, serial).await;
    let Some(persisted) = persisted else {
        set_http_proxy(adb_path, serial, ":0").await.ok();
        return get_proxy_state(adb_path, data_root, serial).await;
    };

    let restore = if persisted.backup_http_proxy == "null" {
        ":0"
    } else {
        persisted.backup_http_proxy.as_str()
    };
    set_http_proxy(adb_path, serial, restore).await?;
    if persisted.mode == ProxyMode::UsbReverse {
        remove_reverse(adb_path, serial, persisted.port).await?;
    }
    remove_persisted(data_root, serial).await?;
    get_proxy_state(adb_path, data_root, serial).await
}

#[cfg(test)]
mod tests {
    use std::net::{IpAddr, Ipv4Addr, SocketAddr};

    use super::*;

    #[test]
    fn pick_lan_host_from_access_list() {
        let addrs = vec![
            SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 7788),
            SocketAddr::new(IpAddr::V4(Ipv4Addr::new(192, 168, 1, 10)), 7788),
        ];
        let host = pick_lan_host(&addrs, None).unwrap();
        assert_eq!(host, "192.168.1.10");
    }

    #[test]
    fn pick_lan_host_override() {
        let host = pick_lan_host(&[], Some("10.0.0.2:9999")).unwrap();
        assert_eq!(host, "10.0.0.2");
    }

    #[test]
    fn pick_lan_host_fails_loopback_only() {
        let addrs = vec![SocketAddr::new(
            IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)),
            7788,
        )];
        assert!(pick_lan_host(&addrs, None).is_err());
    }
}