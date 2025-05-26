use anyhow::Result;
use clap::Parser;
use lynx_cli::{Args, ProxyApp};
use tokio::signal;

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();
    let app = ProxyApp::new(args);
    app.start_server().await?;

    signal::ctrl_c()
        .await
        .expect("Failed to install Ctrl+C signal handler");

    Ok(())
}
