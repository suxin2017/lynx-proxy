
use anyhow::{Ok, Result};
use proxy_server::server::Server;
use proxy_server::server_context::set_up_context;
use tracing_subscriber::{
    filter::FilterFn, fmt, layer::SubscriberExt, util::SubscriberInitExt, Layer,
};

#[tokio::main]
async fn main() -> Result<()> {
    let my_filter = FilterFn::new(|metadata| {
        // Only enable spans or events with the target "interesting_things"
        {
            metadata.target().starts_with("proxy")
        }
    });
    tracing_subscriber::registry()
        .with(fmt::layer().with_filter(my_filter))
        .init();
    set_up_context().await;

    Server::new(3000).run().await?;
    let _ = tokio::signal::ctrl_c().await;
    Ok(())
}
