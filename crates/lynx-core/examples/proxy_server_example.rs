use anyhow::Result;
use lynx_core::proxy_server::ProxyServerBuilder;
use tokio::signal;
use tracing_subscriber::{EnvFilter, fmt, layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::registry()
        .with(fmt::layer())
        .with(EnvFilter::from_default_env().add_directive("lynx_core=trace".parse()?))
        .init();
    let mut server = ProxyServerBuilder::default().port(3000).build().await?;

    server.run().await?;

    signal::ctrl_c()
        .await
        .expect("Failed to install Ctrl+C signal handler");
    Ok(())
}
