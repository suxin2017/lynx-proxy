use std::path::{Path, PathBuf};
use std::sync::Arc;

use anyhow::Result;
use console::style;
use include_dir::include_dir;

use lynx_core::proxy_server::server_ca_manage::ServerCaManagerBuilder;
use lynx_core::proxy_server::server_config::ProxyServerConfigBuilder;
use lynx_core::proxy_server::{ProxyServerBuilder, StaticDir};
use sea_orm::ConnectOptions;
use tracing::info;

pub struct ProxyServerApp {
    port: u16,
    data_dir: Option<String>,
    daemon: bool,
}

impl ProxyServerApp {
    pub fn new(port: u16, data_dir: Option<String>, daemon: bool) -> Self {
        Self {
            port,
            data_dir,
            daemon,
        }
    }

    pub fn get_data_dir(&self) -> Result<PathBuf> {
        crate::resolve_data_dir(self.data_dir.clone())
    }

    pub async fn start_server(&self) -> Result<()> {
        let data_dir = self.get_data_dir()?;

        if !self.daemon {
            println!(
                "The proxy service data directory: \n{}",
                style(data_dir.display()).yellow()
            );
        } else {
            info!("The proxy service data directory: {}", data_dir.display());
        }

        let assets_dir = include_dir!("$CARGO_MANIFEST_DIR/assets");

        let server_config = ProxyServerConfigBuilder::default()
            .root_cert_file_path(data_dir.join("root.pem"))
            .root_key_file_path(data_dir.join("key.pem"))
            .build()?;

        let server_ca_manager = ServerCaManagerBuilder::new(
            server_config.root_cert_file_path.clone(),
            server_config.root_key_file_path.clone(),
        )
        .build()?;

        let db_connect = ConnectOptions::new(format!(
            "sqlite://{}/lynx.db?mode=rwc",
            data_dir.to_string_lossy()
        ));

        let mut proxy_server = ProxyServerBuilder::default()
            .config(Arc::new(server_config))
            .port(self.port)
            .server_ca_manager(Arc::new(server_ca_manager))
            .db_config(db_connect)
            .static_dir(Arc::new(StaticDir(assets_dir)))
            .build()
            .await?;

        proxy_server.run().await?;

        let addrs = proxy_server
            .access_addr_list
            .iter()
            .map(|addr| format!("  http://{} and https://{}", addr, addr))
            .collect::<Vec<String>>()
            .join("\n");

        let web_path = proxy_server
            .access_addr_list
            .iter()
            .map(|addr| format!("  http://{}", addr))
            .collect::<Vec<String>>()
            .join("\n");

        if !self.daemon {
            println!("The proxy service was started");
            println!("{}{}", style("Available on: \n").green(), addrs);
            println!("{}{}", style("Web UI is available on:\n").green(), web_path);
        } else {
            info!("The proxy service was started");
            info!("Available on: \n{}", addrs);
            info!("Web UI is available on:\n{}", web_path);
        }

        if self.daemon {
            println!("The proxy service is running in daemon mode, press Ctrl+C to stop.");
            loop {
                tokio::time::sleep(tokio::time::Duration::from_secs(3600)).await;
            }
        }

        Ok(())
    }
}

#[allow(dead_code)]
fn escape_spaces_in_path(path: &Path) -> String {
    path.to_string_lossy()
        .chars()
        .flat_map(|c| {
            if c == ' ' {
                vec!['\\', ' '].into_iter()
            } else {
                vec![c].into_iter()
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_app(data_dir: Option<String>) -> ProxyServerApp {
        ProxyServerApp::new(3000, data_dir, false)
    }

    #[tokio::test]
    async fn test_startup_validation() -> Result<()> {
        let app = create_test_app(None);
        app.start_server().await?;

        Ok(())
    }
}
