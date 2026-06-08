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

pub async fn load_persisted(data_root: &Path, serial: &str) -> Option<PersistedProxyStateFile> {
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

async fn delete_http_proxy_setting(adb_path: &Path, serial: &str) -> Result<()> {
    let output = run_adb(
        adb_path,
        Some(serial),
        &["shell", "settings", "delete", "global", "http_proxy"],
    )
    .await?;
    ensure_success(&output, "delete http_proxy")?;
    Ok(())
}

/// Clear the device HTTP proxy (some OEM builds keep `:0` until the key is deleted).
async fn force_clear_http_proxy(adb_path: &Path, serial: &str) -> Result<()> {
    set_http_proxy(adb_path, serial, ":0").await?;
    if delete_http_proxy_setting(adb_path, serial).await.is_err() {
        set_http_proxy(adb_path, serial, ":0").await?;
    }
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
        return Err(anyhow!(
            "adb reverse --remove failed: {}",
            adb_output_message(&output)
        ));
    }
    Ok(())
}

pub async fn list_reverse_entries(adb_path: &Path, serial: &str) -> Result<Vec<String>> {
    let output = run_adb(adb_path, Some(serial), &["reverse", "--list"]).await?;
    ensure_success(&output, "adb reverse --list")?;
    Ok(adb_output_message(&output)
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(str::to_string)
        .collect())
}

pub fn reverse_list_contains_port(entries: &[String], port: u16) -> bool {
    let needle = format!("tcp:{port}");
    entries.iter().any(|line| line.contains(&needle))
}

pub async fn list_reverse(adb_path: &Path, serial: &str, port: u16) -> bool {
    list_reverse_entries(adb_path, serial)
        .await
        .map(|entries| reverse_list_contains_port(&entries, port))
        .unwrap_or(false)
}

/// Remove every adb reverse mapping that references `tcp:{port}`.
async fn remove_reverse_mappings(adb_path: &Path, serial: &str, port: u16) -> Result<()> {
    let spec = format!("tcp:{port}");
    let entries = list_reverse_entries(adb_path, serial).await.unwrap_or_default();
    if !reverse_list_contains_port(&entries, port) {
        return Ok(());
    }

    let mut last_error = None;
    for _ in 0..entries.len().max(1) {
        match remove_reverse(adb_path, serial, port).await {
            Ok(()) => {
                let remaining = list_reverse_entries(adb_path, serial)
                    .await
                    .unwrap_or_default();
                if !reverse_list_contains_port(&remaining, port) {
                    return Ok(());
                }
            }
            Err(error) => last_error = Some(error),
        }
    }

    let output = run_adb(adb_path, Some(serial), &["reverse", "--remove-all"]).await?;
    if output.status.success() {
        let remaining = list_reverse_entries(adb_path, serial)
            .await
            .unwrap_or_default();
        if !reverse_list_contains_port(&remaining, port) {
            return Ok(());
        }
    }

    if let Some(error) = last_error {
        return Err(error.context(format!("failed to remove adb reverse {spec}")));
    }
    Err(anyhow!("adb reverse {spec} is still active after cleanup"))
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
    if let Err(error) = set_http_proxy(adb_path, &payload.serial, &proxy_value).await {
        if payload.mode == ProxyMode::UsbReverse {
            remove_reverse_mappings(adb_path, &payload.serial, port)
                .await
                .ok();
        }
        return Err(error);
    }

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
    let port = persisted.as_ref().map(|state| state.port).unwrap_or(7788);

    if let Some(persisted) = persisted {
        if persisted.backup_http_proxy == "null" {
            force_clear_http_proxy(adb_path, serial).await?;
        } else {
            set_http_proxy(adb_path, serial, persisted.backup_http_proxy.as_str()).await?;
        }
        remove_persisted(data_root, serial).await?;
    } else {
        force_clear_http_proxy(adb_path, serial).await?;
    }

    remove_reverse_mappings(adb_path, serial, port).await?;

    let state = get_proxy_state(adb_path, data_root, serial).await?;
    if proxy_still_active(&state, port) {
        return Err(anyhow!(
            "device proxy not fully cleared (http_proxy={:?}, reverse_active={}); \
             try toggling airplane mode or force-stopping the app under test",
            state.current_http_proxy,
            state.reverse_active
        ));
    }
    Ok(state)
}

fn proxy_still_active(state: &ProxyState, port: u16) -> bool {
    if state.reverse_active {
        return true;
    }
    let Some(current) = state.current_http_proxy.as_deref() else {
        return false;
    };
    if current.is_empty() || current == "null" || current == ":0" {
        return false;
    }
    current.contains(&format!(":{port}"))
        || current.starts_with("127.0.0.1")
        || current.starts_with("localhost")
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

    #[test]
    fn reverse_list_contains_port_matches_adb_output() {
        let entries = vec![
            "UsbFfs tcp:7788 tcp:7788".to_string(),
            "UsbFfs tcp:8080 tcp:8080".to_string(),
        ];
        assert!(reverse_list_contains_port(&entries, 7788));
        assert!(!reverse_list_contains_port(&entries, 9999));
    }

    #[test]
    fn proxy_still_active_detects_reverse_and_loopback_proxy() {
        let cleared = ProxyState {
            serial: "emulator-5554".to_string(),
            current_http_proxy: Some(":0".to_string()),
            lynx_managed: false,
            mode: None,
            reverse_active: false,
            backup_http_proxy: None,
        };
        assert!(!proxy_still_active(&cleared, 7788));

        let reverse_only = ProxyState {
            reverse_active: true,
            ..cleared.clone()
        };
        assert!(proxy_still_active(&reverse_only, 7788));

        let usb_proxy = ProxyState {
            current_http_proxy: Some("127.0.0.1:7788".to_string()),
            reverse_active: false,
            ..cleared.clone()
        };
        assert!(proxy_still_active(&usb_proxy, 7788));

        let lan_proxy = ProxyState {
            current_http_proxy: Some("192.168.1.10:7788".to_string()),
            reverse_active: false,
            ..cleared
        };
        assert!(proxy_still_active(&lan_proxy, 7788));
    }
}