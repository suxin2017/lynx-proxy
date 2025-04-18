use anyhow::Result;
use lynx_core::proxy_server::ProxyServerBuilder;
use tokio::signal;

#[tokio::main]
async fn main() -> Result<()> {
    let server = ProxyServerBuilder::default().port(3000).build().await?;

    server.run().await?;

    signal::ctrl_c()
        .await
        .expect("Failed to install Ctrl+C signal handler");
    Ok(())
}
