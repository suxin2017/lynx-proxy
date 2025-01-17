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

async fn init_test_server() -> (SocketAddr, Client) {
    let server_context = set_up_context().await;

    let server = Server::new(3000, server_context);
    server.run().await.unwrap();
    let client = build_http_client();
    return (server.local_addr, client);
}

#[tokio::test]
async fn test_hello() {
    init_tracing();
    let (addr, client) = init_test_server().await;

    let res = client
        .get(format!("http://172.16.104.136:3000/__self_service_path__/hello"))
        .send()
        .await
        .unwrap();
    dbg!(res);
}
