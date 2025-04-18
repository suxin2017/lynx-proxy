use std::{path::PathBuf, sync::Arc};

use anyhow::{Ok, Result};
use lynx_mock::{client::MockClient, server::MockServer};
use tempdir::TempDir;
use tracing::info;
use tracing_subscriber::{EnvFilter, fmt, layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::registry()
        .with(fmt::layer())
        .with(EnvFilter::from_default_env().add_directive("lynx_mock=trace".parse()?))
        .init();
    let mut server = MockServer::new(Some(3000));
    server.write_cert_to_file()?;
    server.start_server().await?;

    tokio::signal::ctrl_c()
        .await
        .expect("Failed to install Ctrl+C signal handler");
    Ok(())
}
