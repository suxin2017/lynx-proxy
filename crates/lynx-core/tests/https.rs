use std::net::SocketAddr;

use common::{
    build_proxy_client::{build_https_client, build_https_proxy_client},
    start_http_server::start_https_server,
    test_server::{ECHO_PATH, GZIP_PATH, HELLO_PATH, PING_PATH},
    tracing_config::init_tracing,
};
use http::header::CONTENT_TYPE;
use lynx_core::{server::Server, server_context::set_up_context};
use reqwest::Client;
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
async fn hello_test() {
    init_tracing();
    let (addr, direct_request_client, proxy_request_client) = init_test_server().await;
    let direct_res = direct_request_client
        .get(format!("https://{addr}{HELLO_PATH}"))
        .send()
        .await
        .unwrap();
    let lynx_core_res = proxy_request_client
        .get(format!("https://{addr}{HELLO_PATH}"))
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
    init_tracing();
    let (addr, direct_request_client, proxy_request_client) = init_test_server().await;

    let direct_res = direct_request_client
        .get(format!("https://{addr}{GZIP_PATH}"))
        .send()
        .await
        .unwrap();
    let lynx_core_res = proxy_request_client
        .get(format!("https://{addr}{GZIP_PATH}"))
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
    init_tracing();
    let (addr, direct_request_client, proxy_request_client) = init_test_server().await;

    let direct_res = direct_request_client
        .get(format!("https://{addr}{}", ECHO_PATH))
        .header(CONTENT_TYPE, "application/json")
        .send()
        .await
        .unwrap();
    let lynx_core_res = proxy_request_client
        .get(format!("https://{addr}{}", ECHO_PATH))
        .header(CONTENT_TYPE, "application/json")
        .send()
        .await
        .unwrap();

    assert_eq!(direct_res.headers(), lynx_core_res.headers());
}

#[tokio::test]
async fn ping_pong_test() {
    init_tracing();
    let (addr, direct_request_client, proxy_request_client) = init_test_server().await;

    let direct_res = direct_request_client
        .post(format!("https://{addr}{}", PING_PATH))
        .send()
        .await
        .unwrap();

    let lynx_core_res = proxy_request_client
        .post(format!("https://{addr}{}", PING_PATH))
        .send()
        .await
        .unwrap();

    assert_eq!(
        direct_res.bytes().await.unwrap(),
        lynx_core_res.bytes().await.unwrap()
    );
}



#[tokio::test]
async fn baidu_test() {
    init_tracing();
    let (_, direct_request_client, proxy_request_client) = init_test_server().await;

    let direct_res = direct_request_client
        .post("https://www.baidu.com")
        .send()
        .await
        .unwrap();

    let lynx_core_res = proxy_request_client
        .post("https://www.baidu.com")
        .send()
        .await
        .unwrap();
    assert_eq!(
        direct_res.bytes().await.unwrap(),
        lynx_core_res.bytes().await.unwrap()
    );
}