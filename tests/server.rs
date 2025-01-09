use anyhow::Result;
use bytes::Bytes;
use common::{init_tracing, HELLO_WORLD};
use http_body_util::Full;
use tracing_subscriber::{
    filter::FilterFn, fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter, Layer,
};

pub mod common;

use crate::common::{build_proxy_client, start_http_server, start_proxy};

#[tokio::test]
async fn test_http() -> Result<()> {
    init_tracing();

    start_proxy().await?;
    let (server_addr, stop_server) = start_http_server().await?;

    let proxy_client = build_proxy_client("http://127.0.0.1:3000")?;

    let res = proxy_client
        .get(format!("http://localhost:{}/hello", server_addr.port()))
        .send()
        .await?;

    assert_eq!(res.status(), 200);
    dbg!(res.text().await?);
    // assert_eq!(res.text().await?, HELLO_WORLD);

    let _ = stop_server.send(());
    Ok(())
}

#[tokio::test]
async fn test_frame() {
    let data = Full::new(Bytes::from("hello"));
}
