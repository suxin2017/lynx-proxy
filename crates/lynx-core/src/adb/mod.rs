mod devices;
mod executor;
mod platform_tools;
mod proxy;
pub mod types;

use std::net::SocketAddr;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use anyhow::{Result, anyhow};
use tokio::sync::RwLock;

pub use types::*;

use devices::parse_devices_output;
use executor::{
    adb_output_message, adb_version, bundled_adb_path, ensure_success, resolve_path_adb, run_adb,
};
use platform_tools::{download_and_extract, platform_tools_dir, verify_bundled};
use proxy::{disable_proxy, enable_proxy, get_proxy_state};

#[derive(Clone)]
pub struct AdbManager {
    data_root: PathBuf,
    install_progress: Arc<RwLock<InstallProgress>>,
    local_only: bool,
}

impl AdbManager {
    pub fn new(data_root: impl AsRef<Path>, local_only: bool) -> Self {
        Self {
            data_root: data_root.as_ref().to_path_buf(),
            install_progress: Arc::new(RwLock::new(InstallProgress::default())),
            local_only,
        }
    }

    pub fn install_progress_handle(&self) -> Arc<RwLock<InstallProgress>> {
        self.install_progress.clone()
    }

    pub async fn resolve_adb_path(&self) -> Result<Option<PathBuf>> {
        if let Some(path) = resolve_path_adb().await
            && adb_version(&path).await.is_ok()
        {
            return Ok(Some(path));
        }
        let bundled_dir = platform_tools_dir(&self.data_root);
        let bundled = bundled_adb_path(&bundled_dir);
        if bundled.exists() && verify_bundled(&bundled).await {
            return Ok(Some(bundled));
        }
        Ok(None)
    }

    pub async fn status(&self) -> AdbStatus {
        match self.resolve_adb_path().await {
            Ok(Some(path)) => {
                let version = adb_version(&path).await.ok();
                let source = if path == *"adb" {
                    AdbSource::Path
                } else {
                    AdbSource::Bundled
                };
                AdbStatus {
                    ready: true,
                    adb_path: Some(path.to_string_lossy().to_string()),
                    version,
                    source,
                }
            }
            _ => AdbStatus {
                ready: false,
                adb_path: None,
                version: None,
                source: AdbSource::None,
            },
        }
    }

    pub async fn install_platform_tools(&self) -> Result<AdbStatus> {
        {
            let p = self.install_progress.read().await;
            if p.phase == InstallPhase::Downloading || p.phase == InstallPhase::Extracting {
                return Ok(self.status().await);
            }
        }

        if let Some(path) = self.resolve_adb_path().await? {
            let mut p = self.install_progress.write().await;
            *p = InstallProgress {
                phase: InstallPhase::Done,
                percent: 100,
                message: Some("ADB already available".to_string()),
                error: None,
            };
            let _ = path;
            return Ok(self.status().await);
        }

        match download_and_extract(&self.data_root, &self.install_progress).await {
            Ok(_) => Ok(self.status().await),
            Err(err) => {
                let mut p = self.install_progress.write().await;
                p.phase = InstallPhase::Failed;
                p.error = Some(err.to_string());
                Err(err)
            }
        }
    }

    pub async fn install_progress(&self) -> InstallProgress {
        self.install_progress.read().await.clone()
    }

    pub async fn list_devices(&self) -> Result<Vec<AdbDevice>> {
        let adb = self
            .resolve_adb_path()
            .await?
            .ok_or_else(|| anyhow!("ADB is not installed; run install first"))?;
        let output = run_adb(&adb, None, &["devices", "-l"]).await?;
        ensure_success(&output, "adb devices")?;
        Ok(parse_devices_output(&adb_output_message(&output)))
    }

    pub async fn proxy_state(&self, adb: &Path, serial: &str) -> Result<ProxyState> {
        get_proxy_state(adb, &self.data_root, serial).await
    }

    pub async fn enable_proxy(
        &self,
        access_addrs: &[SocketAddr],
        payload: EnableProxyPayload,
    ) -> Result<ProxyState> {
        let adb = self
            .resolve_adb_path()
            .await?
            .ok_or_else(|| anyhow!("ADB is not installed"))?;
        enable_proxy(
            &adb,
            &self.data_root,
            access_addrs,
            self.local_only,
            payload,
        )
        .await
    }

    pub async fn disable_proxy(&self, serial: &str) -> Result<ProxyState> {
        let adb = self
            .resolve_adb_path()
            .await?
            .ok_or_else(|| anyhow!("ADB is not installed"))?;
        disable_proxy(&adb, &self.data_root, serial).await
    }

    pub fn local_only(&self) -> bool {
        self.local_only
    }
}
