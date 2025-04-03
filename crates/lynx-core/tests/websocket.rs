use common::{
    build_proxy_client::build_http_client, test_server::WORLD, tracing_config::init_tracing,
};
use futures_util::{SinkExt, TryStreamExt};
use lynx_core::{
    self_service::paths::SelfServiceRouterPath, server::Server, server_context::set_up_context,
};
use reqwest_websocket::{Message, RequestBuilderExt};
pub mod common;

use crate::common::start_http_server::start_http_server;

#[tokio::test]
async fn ws_test() {
    init_tracing();
    set_up_context(Default::default()).await;
    let direct_request_client = build_http_client();

    let addr: std::net::SocketAddr = start_http_server().await.unwrap();
    let proxy_addr = format!("http://127.0.0.1:3000");

    let proxy = reqwest::Proxy::all(proxy_addr.clone()).unwrap();

    let client = reqwest::Client::builder()
        .proxy(proxy)
        .no_brotli()
        .no_deflate()
        .no_gzip()
        .build()
        .unwrap();
    let response = client
        .get(format!("ws://{}", addr))
        .upgrade()
        .send()
        .await
        .unwrap();

    // Turns the response into a WebSocket stream.
    let mut websocket = response.into_websocket().await.unwrap();
    // The WebSocket implements `Sink<Message>`.
    websocket
        .send(Message::Text("Hello, World".into()))
        .await
        .unwrap();
    // The WebSocket is also a `TryStream` over `Message`s.
    while let Some(message) = websocket.try_next().await.unwrap() {
        println!("Received message: {:?}", message);
    }
}
