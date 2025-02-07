use anyhow::anyhow;
use bytes::Bytes;
use common::{
    build_proxy_client::{build_http_client, build_http_proxy_client},
    test_server::{ECHO_PATH, GZIP_PATH, HELLO_PATH, PING_PATH, PUSH_MSG_PATH},
    tracing_config::init_tracing,
};
use futures_util::TryStreamExt;
use http::header::CONTENT_TYPE;
use lynx_core::{server::Server, server_context::set_up_context};
use reqwest::Client;
use std::{net::SocketAddr, time::Duration};
use tokio::{sync::broadcast, time::interval};
use tokio_stream::wrappers::BroadcastStream;
pub mod common;

use crate::common::start_http_server::start_http_server;

async fn init_test_server() -> (SocketAddr, Client, Client) {
    init_tracing();
    set_up_context(None).await;

    let addr: std::net::SocketAddr = start_http_server().await.unwrap();
    let mut lynx_core = Server::new(Default::default());
    lynx_core.run().await.unwrap();
    let proxy_addr = format!("http://{}", lynx_core.access_addr_list.first().unwrap());

    let direct_request_client = build_http_client();

    let proxy_request_client = build_http_proxy_client(&proxy_addr);

    (addr, direct_request_client, proxy_request_client)
}

#[tokio::test]
async fn hello_test() {
    let (addr, direct_request_client, proxy_request_client) = init_test_server().await;
    let direct_res = direct_request_client
        .get(format!("http://{addr}{HELLO_PATH}"))
        .send()
        .await
        .unwrap();
    let lynx_core_res = proxy_request_client
        .get(format!("http://{addr}{HELLO_PATH}"))
        .send()
        .await
        .unwrap();
    assert_eq!(
        direct_res.text().await.unwrap(),
        lynx_core_res.text().await.unwrap()
    );
}

#[tokio::test]
async fn gzip_test() {
    let (addr, direct_request_client, proxy_request_client) = init_test_server().await;

    let direct_res = direct_request_client
        .get(format!("http://{addr}{GZIP_PATH}"))
        .send()
        .await
        .unwrap();
    let lynx_core_res = proxy_request_client
        .get(format!("http://{addr}{GZIP_PATH}"))
        .send()
        .await
        .unwrap();

    assert_eq!(
        direct_res.bytes().await.unwrap(),
        lynx_core_res.bytes().await.unwrap()
    );
}

#[tokio::test]
async fn echo_test() {
    let (addr, direct_request_client, proxy_request_client) = init_test_server().await;

    let direct_res = direct_request_client
        .get(format!("http://{addr}{}", ECHO_PATH))
        .header(CONTENT_TYPE, "application/json")
        .send()
        .await
        .unwrap();
    let lynx_core_res = proxy_request_client
        .get(format!("http://{addr}{}", ECHO_PATH))
        .header(CONTENT_TYPE, "application/json")
        .send()
        .await
        .unwrap();

    assert_eq!(
        direct_res.headers().get(CONTENT_TYPE),
        lynx_core_res.headers().get(CONTENT_TYPE)
    );
}

#[tokio::test]
async fn ping_pong_test() {
    let (addr, direct_request_client, proxy_request_client) = init_test_server().await;

    let (tx, rx1) = broadcast::channel(16);
    let rx2 = rx1.resubscribe();
    tokio::spawn(async move {
        let mut interval = interval(Duration::from_millis(200));
        let mut count = 0;
        loop {
            interval.tick().await;
            if tx.send("ping\n").is_err() {
                break;
            }
            if count > 5 {
                break;
            }
            count += 1;
        }
    });

    let stream = BroadcastStream::new(rx1);
    let stream = stream.map_ok(Bytes::from).map_err(|err| anyhow!(err));
    let body = reqwest::Body::wrap_stream(stream);
    let direct_res = direct_request_client
        .post(format!("http://{addr}{}", PING_PATH))
        .body(body)
        .send()
        .await
        .unwrap();
    let stream = BroadcastStream::new(rx2);
    let stream = stream.map_ok(Bytes::from).map_err(|err| anyhow!(err));
    let body = reqwest::Body::wrap_stream(stream);
    let lynx_core_res = proxy_request_client
        .post(format!("http://{addr}{}", PING_PATH))
        .body(body)
        .send()
        .await
        .unwrap();

    assert_eq!(
        direct_res.bytes().await.unwrap(),
        lynx_core_res.bytes().await.unwrap()
    );
}

#[tokio::test]
#[ignore]
async fn push_msg() {
    let addr: std::net::SocketAddr = start_http_server().await.unwrap();
    {
        let direct_request_client = build_http_client();
        let direct_res = direct_request_client
            .post(format!("http://{addr}{}", PUSH_MSG_PATH))
            .send()
            .await
            .unwrap();
        println!("request sent");
        let timeout = tokio::time::sleep(Duration::from_secs(10));
        tokio::select! {
            _ = direct_res.bytes() => {
            },
            _ = timeout => {
                println!("timeout remove client");
            },
        }
    }
}

// #[tokio::test]
// async fn ws_test() {
//
//     let addr: std::net::SocketAddr = start_http_server().await.unwrap();
//     let lynx_core = Server::new();
//     lynx_core.run().await.unwrap();
//     let proxy = reqwest::Proxy::all(format!("http://{}", lynx_core.addr)).unwrap();
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
