use std::path::{Path, PathBuf};

use anyhow::{Context, Result, anyhow};
use serde::{Deserialize, Serialize};
use tokio::fs;
use tokio::io::AsyncWriteExt;

use super::executor::bundled_adb_path;
use super::types::{InstallPhase, InstallProgress};

const GOOGLE_BASE: &str = "https://dl.google.com/android/repository";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct InstalledManifest {
    installed_at_ms: i64,
    target_os: String,
    target_arch: String,
}

fn platform_tools_zip_name() -> Result<&'static str> {
    if cfg!(target_os = "macos") {
        Ok("platform-tools-latest-darwin.zip")
    } else if cfg!(target_os = "linux") {
        Ok("platform-tools-latest-linux.zip")
    } else if cfg!(target_os = "windows") {
        Ok("platform-tools-latest-windows.zip")
    } else {
        Err(anyhow!("unsupported OS for platform-tools download"))
    }
}

fn download_url() -> Result<String> {
    Ok(format!("{GOOGLE_BASE}/{}", platform_tools_zip_name()?))
}

pub fn platform_tools_dir(data_root: &Path) -> PathBuf {
    data_root.join("platform-tools")
}

pub async fn write_manifest(dir: &Path) -> Result<()> {
    let manifest = InstalledManifest {
        installed_at_ms: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as i64,
        target_os: std::env::consts::OS.to_string(),
        target_arch: std::env::consts::ARCH.to_string(),
    };
    let path = dir.join("installed.json");
    let json = serde_json::to_string_pretty(&manifest)?;
    fs::write(path, json).await?;
    Ok(())
}

pub async fn download_and_extract(
    data_root: &Path,
    progress: &tokio::sync::RwLock<InstallProgress>,
) -> Result<PathBuf> {
    let url = download_url()?;
    let dest_dir = platform_tools_dir(data_root);
    if dest_dir.exists() {
        fs::remove_dir_all(&dest_dir).await.ok();
    }
    fs::create_dir_all(data_root).await?;

    {
        let mut p = progress.write().await;
        *p = InstallProgress {
            phase: InstallPhase::Downloading,
            percent: 0,
            message: Some("Downloading platform-tools…".to_string()),
            error: None,
        };
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(300))
        .build()
        .context("build http client for adb download")?;

    let response = client
        .get(&url)
        .send()
        .await
        .context("download platform-tools")?;
    if !response.status().is_success() {
        return Err(anyhow!("download failed: HTTP {}", response.status()));
    }

    let total = response.content_length();
    let mut stream = response.bytes_stream();
    let temp_zip = data_root.join("platform-tools-download.zip");
    let mut file = fs::File::create(&temp_zip).await?;
    let mut downloaded: u64 = 0;

    use futures_util::StreamExt;
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.context("read download chunk")?;
        downloaded += chunk.len() as u64;
        file.write_all(&chunk).await?;
        if let Some(total) = total
            && total > 0
        {
            let percent = ((downloaded * 100) / total).min(99) as u8;
            let mut p = progress.write().await;
            p.percent = percent;
        }
    }
    file.flush().await?;

    {
        let mut p = progress.write().await;
        p.phase = InstallPhase::Extracting;
        p.percent = 99;
        p.message = Some("Extracting platform-tools…".to_string());
    }

    let extract_root = data_root.to_path_buf();
    let temp_zip_clone = temp_zip.clone();
    tokio::task::spawn_blocking(move || extract_zip(&temp_zip_clone, &extract_root))
        .await
        .context("join extract task")??;

    fs::remove_file(&temp_zip).await.ok();

    let adb = bundled_adb_path(&dest_dir);
    if !adb.exists() {
        return Err(anyhow!(
            "platform-tools adb not found at {}; zip layout may have changed",
            adb.display()
        ));
    }

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if adb.exists() {
            let mut perms = fs::metadata(&adb).await?.permissions();
            perms.set_mode(0o755);
            fs::set_permissions(&adb, perms).await?;
        }
    }

    write_manifest(&dest_dir).await?;

    {
        let mut p = progress.write().await;
        p.phase = InstallPhase::Done;
        p.percent = 100;
        p.message = Some("Platform-tools ready".to_string());
    }

    Ok(bundled_adb_path(&dest_dir))
}

fn extract_zip(zip_path: &Path, dest_dir: &Path) -> Result<()> {
    let file = std::fs::File::open(zip_path).context("open platform-tools zip")?;
    let mut archive = zip::ZipArchive::new(file).context("read platform-tools zip")?;
    std::fs::create_dir_all(dest_dir).context("create platform-tools dir")?;
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).context("read zip entry")?;
        let name = entry.name().to_string();
        let is_dir = name.ends_with('/');
        let out_path = dest_dir.join(&name);
        if is_dir {
            std::fs::create_dir_all(&out_path).ok();
            continue;
        }
        if let Some(parent) = out_path.parent() {
            std::fs::create_dir_all(parent).context("create extract parent")?;
        }
        let mut outfile = std::fs::File::create(&out_path).context("create extracted file")?;
        std::io::copy(&mut entry, &mut outfile).context("extract zip entry")?;
    }
    Ok(())
}

pub async fn verify_bundled(adb_path: &Path) -> bool {
    super::executor::adb_version(adb_path).await.is_ok()
}
