use common::{
    build_proxy_client::{build_http_client, build_http_proxy_client},
    test_server::{ECHO_PATH, GZIP_PATH, HELLO_PATH, PING_PATH},
    tracing_config::init_tracing,
};
use futures_util::SinkExt;
use http::header::CONTENT_TYPE;
use proxy_server::{server::Server, server_context::set_up_context};
use reqwest::Client;
use std::net::SocketAddr;
pub mod common;

use crate::common::start_http_server::start_http_server;

async fn init_test_server() -> (SocketAddr, Client, Client) {
    let server_context = set_up_context().await;

    let addr: std::net::SocketAddr = start_http_server().await.unwrap();
    let proxy_server = Server::new(3000,server_context);
    proxy_server.run().await.unwrap();
    let proxy_addr = format!("http://{}", proxy_server.local_addr);

    let direct_request_client = build_http_client();

    let proxy_request_client = build_http_proxy_client(&proxy_addr);

    (addr, direct_request_client, proxy_request_client)
}

#[tokio::test]
async fn hello_test() {
    init_tracing();
    let (addr, direct_request_client, proxy_request_client) = init_test_server().await;
    let direct_res = direct_request_client
        .get(format!("http://{addr}{HELLO_PATH}"))
        .send()
        .await
        .unwrap();
    let proxy_server_res = proxy_request_client
        .get(format!("http://{addr}{HELLO_PATH}"))
        .send()
        .await
        .unwrap();
    assert_eq!(
        direct_res.text().await.unwrap(),
        proxy_server_res.text().await.unwrap()
    );
}

#[tokio::test]
async fn gzip_test() {
    init_tracing();
    let (addr, direct_request_client, proxy_request_client) = init_test_server().await;

    let direct_res = direct_request_client
        .get(format!("http://{addr}{GZIP_PATH}"))
        .send()
        .await
        .unwrap();
    let proxy_server_res = proxy_request_client
        .get(format!("http://{addr}{GZIP_PATH}"))
        .send()
        .await
        .unwrap();

    assert_eq!(
        direct_res.bytes().await.unwrap(),
        proxy_server_res.bytes().await.unwrap()
    );
}

#[tokio::test]
async fn echo_test() {
    init_tracing();
    let (addr, direct_request_client, proxy_request_client) = init_test_server().await;

    let direct_res = direct_request_client
        .get(format!("http://{addr}{}", ECHO_PATH))
        .header(CONTENT_TYPE, "application/json")
        .send()
        .await
        .unwrap();
    let proxy_server_res = proxy_request_client
        .get(format!("http://{addr}{}", ECHO_PATH))
        .header(CONTENT_TYPE, "application/json")
        .send()
        .await
        .unwrap();

    assert_eq!(direct_res.headers(), proxy_server_res.headers());
}

#[tokio::test]
async fn ping_pong_test() {
    init_tracing();
    let (addr, direct_request_client, proxy_request_client) = init_test_server().await;

    let direct_res = direct_request_client
        .post(format!("http://{addr}{}", PING_PATH))
        .send()
        .await
        .unwrap();

    let proxy_server_res = proxy_request_client
        .post(format!("http://{addr}{}", PING_PATH))
        .send()
        .await
        .unwrap();

    assert_eq!(
        direct_res.bytes().await.unwrap(),
        proxy_server_res.bytes().await.unwrap()
    );
}

// #[tokio::test]
// async fn ws_test() {
//     init_tracing();
//     let addr: std::net::SocketAddr = start_http_server().await.unwrap();
//     let proxy_server = Server::new();
//     proxy_server.run().await.unwrap();
//     let proxy = reqwest::Proxy::all(format!("http://{}", proxy_server.addr)).unwrap();
//     let mut client = reqwest::Client::builder()
//         .proxy(proxy)
//         .no_brotli()
//         .no_deflate()
//         .no_gzip()
//         .build()
//         .unwrap();
//     let response = client
//         .get(format!("ws://{}", addr))
//         .upgrade()
//         .send()
//         .await
//         .unwrap();
//     // Turns the response into a WebSocket stream.
//     let mut websocket = response.into_websocket().await.unwrap();

//     // The WebSocket implements `Sink<Message>`.
//     websocket.send(Message::Text("Hello, World".into())).await;
//     // The WebSocket is also a `TryStream` over `Message`s.
//     while let Some(message) = websocket.try_next().await.unwrap() {
//         if let Message::Text(text) = message {
//             println!("received: {text}")
//         }
//     }
//     tokio::signal::ctrl_c().await;
// }
