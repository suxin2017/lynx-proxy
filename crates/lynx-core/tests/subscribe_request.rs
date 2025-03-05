use common::{
    build_proxy_client::{build_http_client, build_http_proxy_client},
    test_server::HELLO_PATH,
    tracing_config::init_tracing,
};
use lynx_core::{
    self_service::paths::SelfServiceRouterPath, server::Server, server_context::set_up_context,
};
use reqwest::Client;
use std::net::SocketAddr;
pub mod common;

use crate::common::start_http_server::start_http_server;

async fn init_test_server() -> (SocketAddr, SocketAddr, Client, Client) {
    set_up_context(Default::default()).await;

    let addr: std::net::SocketAddr = start_http_server().await.unwrap();
    let mut lynx_core = Server::new(Default::default());
    lynx_core.run().await.unwrap();
    let proxy_addr = format!("http://{}", lynx_core.access_addr_list.first().unwrap());

    let direct_request_client = build_http_client();

    let proxy_request_client = build_http_proxy_client(&proxy_addr);

    (
        addr,
        *lynx_core.access_addr_list.first().unwrap(),
        direct_request_client,
        proxy_request_client,
    )
}

#[tokio::test]
async fn request_test() {
    init_tracing();
    let (addr, proxy_addr, direct_request_client, proxy_request_client) = init_test_server().await;

    let mut log = direct_request_client
        .get(format!(
            "http://{proxy_addr}{}",
            SelfServiceRouterPath::RequestLog
        ))
        .send()
        .await
        .unwrap();

    let lynx_core_res = proxy_request_client
        .get(format!("http://{addr}{HELLO_PATH}"))
        .send()
        .await
        .unwrap();

    assert_eq!(lynx_core_res.text().await.unwrap(), "Hello, World!");

    let chunk = log.chunk().await.unwrap();
    assert!(chunk.is_some());
}
