use std::path::Path;

use anyhow::{Ok, Result};
use proxy_server::cert::init_ca;
use proxy_server::server_context::set_up_context;
use proxy_server::{cert::CERT_MANAGER, server::Server};
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
            metadata.target().starts_with("proxy")
        }
    });
    tracing_subscriber::registry()
        .with(fmt::layer().with_filter(my_filter))
        .init();
    let server_context = set_up_context().await;

    Server::new(3000,server_context).run().await?;
    let _ = tokio::signal::ctrl_c().await;
    Ok(())
}
