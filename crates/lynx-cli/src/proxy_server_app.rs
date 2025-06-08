use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use anyhow::Result;
use console::style;
use include_dir::include_dir;
use interprocess::local_socket::{GenericNamespaced, Stream, prelude::*};

use lynx_core::proxy_server::server_ca_manage::ServerCaManagerBuilder;
use lynx_core::proxy_server::server_config::ProxyServerConfigBuilder;
use lynx_core::proxy_server::{ProxyServerBuilder, StaticDir};
use sea_orm::ConnectOptions;
use tracing::info;

pub struct ProxyServerApp {
    port: u16,
    data_dir: Option<String>,
    daemon: bool,
    ipc_socket: Option<String>,
}

impl ProxyServerApp {
    pub fn new(
        port: u16,
        data_dir: Option<String>,
        daemon: bool,
        ipc_socket: Option<String>,
    ) -> Self {
        Self {
            port,
            data_dir,
            daemon,
            ipc_socket,
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
                style(data_dir.to_string_lossy()).yellow()
            );
        } else {
            info!(
                "The proxy service data directory: {}",
                data_dir.to_string_lossy()
            );
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

        // 如果是daemon模式且有IPC套接字，发送连接地址给父进程
        if self.daemon && self.ipc_socket.is_some() {
            if let Some(ipc_socket_path) = &self.ipc_socket {
                self.send_connection_info_to_parent(
                    ipc_socket_path,
                    &proxy_server.access_addr_list,
                )?;
            }
        }

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

    fn send_connection_info_to_parent(
        &self,
        ipc_socket_path: &str,
        addr_list: &[std::net::SocketAddr],
    ) -> Result<()> {
        let name = ipc_socket_path.to_ns_name::<GenericNamespaced>()?;

        let mut coon = Stream::connect(name)?;
        let addr_list = serde_json::to_string(addr_list)?;

        coon.write_all(addr_list.as_bytes())?;

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
        ProxyServerApp::new(3000, data_dir, false, None)
    }

    #[tokio::test]
    async fn test_startup_validation() -> Result<()> {
        let app = create_test_app(None);
        app.start_server().await?;

        Ok(())
    }
}
