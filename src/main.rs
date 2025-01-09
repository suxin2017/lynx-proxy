use std::convert::Infallible;
use std::net::SocketAddr;

use anyhow::{Ok, Result};
use bytes::Bytes;
use futures_util::FutureExt;
use http_body_util::{BodyDataStream, BodyExt, Full};
use proxy_rust::server::Server;
use tracing_subscriber::{filter::FilterFn, fmt, layer::SubscriberExt, util::SubscriberInitExt, Layer};

#[tokio::main]
async fn main() -> Result<()> {
    let my_filter = FilterFn::new(|metadata| {
        // Only enable spans or events with the target "interesting_things"
        {
            metadata.target().starts_with("proxy_rust")
        }
    });
    tracing_subscriber::registry()
        .with(fmt::layer().with_filter(my_filter))
        .init();
    Server {}.run().await?;

    Ok(())
}
