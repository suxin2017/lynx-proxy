use std::net::SocketAddr;

use common::{
    build_proxy_client::{build_http_client, build_https_client, build_https_proxy_client},
    start_http_server::start_https_server,
    test_server::{HELLO_WORLD, WORLD},
    tracing_config::init_tracing,
};
use futures_util::{SinkExt, TryStreamExt};
use lynx_core::{
    self_service::paths::SelfServiceRouterPath, server::Server, server_context::set_up_context,
};
use reqwest::Client;
use reqwest_websocket::{Message, RequestBuilderExt};
pub mod common;

async fn init_test_server() -> (SocketAddr, Client, Client) {
    set_up_context(Default::default()).await;

    let addr: std::net::SocketAddr = start_https_server().await.unwrap();
    let mut lynx_core = Server::new(Default::default());
    lynx_core.run().await.unwrap();
    let proxy_addr = format!("http://{}", lynx_core.access_addr_list.first().unwrap());

    let direct_request_client = build_https_client();

    let proxy_request_client = build_https_proxy_client(&proxy_addr);
    (addr, direct_request_client, proxy_request_client)
}

#[tokio::test]
async fn send_ws_by_proxy() {
    init_tracing();
    let (addr, direct_request_client, proxy_request_client) = init_test_server().await;

    set_up_context(Default::default()).await;

    let response = proxy_request_client
        .get(format!("ws://{}", addr))
        .upgrade()
        .send()
        .await
        .unwrap();

    // Turns the response into a WebSocket stream.
    let mut websocket = response.into_websocket().await.unwrap();
    websocket.send(Message::Ping(b"data".into())).await.unwrap();
    // The WebSocket implements `Sink<Message>`.
    websocket
        .send(Message::Text("Hello, World".into()))
        .await
        .unwrap();
    websocket
        .send(Message::Binary(b"binary data".into()))
        .await
        .unwrap();

    let mut count = 0;
    // The WebSocket is also a `TryStream` over `Message`s.
    while let Some(message) = websocket.try_next().await.unwrap() {
        println!("Received message: {:?}", message);
        if count >= 3 {
            break;
        }
        count += 1;
    }
    tokio::signal::ctrl_c().await.unwrap();
}
