use std::net::SocketAddr;
use std::{convert::Infallible, path::Path};

use anyhow::{Ok, Result};
use bytes::Bytes;
use futures_util::FutureExt;
use http_body_util::{BodyDataStream, BodyExt, Full};
use proxy_rust::cert::init_ca;
use proxy_rust::{cert::CERT_MANAGER, server::Server};
use tracing_subscriber::{
    filter::FilterFn, fmt, layer::SubscriberExt, util::SubscriberInitExt, Layer,
};

#[tokio::main]
async fn main() -> Result<()> {
    let ca_cert_file = Path::new("ca.cert");
    let private_key_file = Path::new("ca.key");

    let ca_manager = init_ca(ca_cert_file, private_key_file).unwrap();
    CERT_MANAGER.set(ca_manager);

    let my_filter = FilterFn::new(|metadata| {
        // Only enable spans or events with the target "interesting_things"
        {
            metadata.target().starts_with("proxy_rust")
        }
    });
    tracing_subscriber::registry()
        .with(fmt::layer().with_filter(my_filter))
        .init();

    Server::new().run().await?;
    tokio::signal::ctrl_c()
        .await;
    Ok(())
}
