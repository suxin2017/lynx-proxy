use std::convert::Infallible;
use std::net::SocketAddr;

use anyhow::{Ok, Result};
use bytes::Bytes;
use futures_util::FutureExt;
use http_body_util::{BodyDataStream, BodyExt, Full};
use proxy_rust::server::Server;
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, Layer};

#[tokio::main]
async fn main() -> Result<()> {
    // Server {}.run().await;

    // 只有注册 subscriber 后， 才能在控制台上看到日志输出
    Ok(())
}
