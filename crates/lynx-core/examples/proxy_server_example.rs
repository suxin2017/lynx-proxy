use std::{path::PathBuf, sync::Arc};

use anyhow::Result;
use lynx_core::proxy_server::{
    ProxyServerBuilder, server_ca_manage::ServerCaManagerBuilder,
    server_config::ProxyServerConfigBuilder,
};
use sea_orm::ConnectOptions;
use tempdir::TempDir;
use tokio::signal;
use tracing_subscriber::{EnvFilter, fmt, layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::registry()
        .with(fmt::layer())
        .with(EnvFilter::from_default_env().add_directive("lynx_core=trace".parse()?))
        .init();
    let temp_dir = TempDir::new_in(
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("examples"),
        "temp",
    )?;
    let temp_dir_path = temp_dir.path();

    let server_config = ProxyServerConfigBuilder::default()
        .root_cert_file_path(temp_dir_path.join("root.pem"))
        .root_key_file_path(temp_dir_path.join("key.pem"))
        .build()?;

    let server_ca_manager = ServerCaManagerBuilder::new(
        server_config.root_cert_file_path.clone(),
        server_config.root_key_file_path.clone(),
    )
    .build()?;

    let mut proxy_server = ProxyServerBuilder::default()
        .config(Arc::new(server_config))
        .port(3000)
        .server_ca_manager(Arc::new(server_ca_manager))
        .db_config(ConnectOptions::new("sqlite::memory:"))
        .build()
        .await?;
    proxy_server.run().await?;

    signal::ctrl_c()
        .await
        .expect("Failed to install Ctrl+C signal handler");
    Ok(())
}
