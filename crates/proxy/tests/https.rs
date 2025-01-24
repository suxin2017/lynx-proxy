use std::net::SocketAddr;

use common::{
    build_proxy_client::build_https_client,
    constant::TEST_ROOT_CA_CERT,
    start_http_server::start_https_server,
    test_server::{ECHO_PATH, GZIP_PATH, HELLO_PATH, PING_PATH},
    tracing_config::init_tracing,
};
use http::header::CONTENT_TYPE;
use proxy_server::{
    server::Server,
    server_context::{set_up_context, CA_MANAGER},
};
use reqwest::Client;
pub mod common;

async fn init_test_server() -> (SocketAddr, Client, Client) {
    set_up_context().await;

    let addr: std::net::SocketAddr = start_https_server().await.unwrap();
    let mut proxy_server = Server::new(3000);
    proxy_server.run().await.unwrap();
    let proxy_addr = format!("http://{}", proxy_server.access_addr_list.first().unwrap());

    let direct_request_client = build_https_client(TEST_ROOT_CA_CERT.clone());

    let proxy_ca_cert =
        reqwest::Certificate::from_pem(CA_MANAGER.get().unwrap().ca_cert.pem().as_bytes()).unwrap();
    let proxy = reqwest::Proxy::all(proxy_addr).unwrap();

    let proxy_request_client = reqwest::Client::builder()
        .no_brotli()
        .no_deflate()
        .use_rustls_tls()
        .add_root_certificate(proxy_ca_cert)
        .proxy(proxy)
        .build()
        .unwrap();

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
    let proxy_server_res = proxy_request_client
        .get(format!("https://{addr}{HELLO_PATH}"))
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
        .get(format!("https://{addr}{GZIP_PATH}"))
        .send()
        .await
        .unwrap();
    let proxy_server_res = proxy_request_client
        .get(format!("https://{addr}{GZIP_PATH}"))
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
        .get(format!("https://{addr}{}", ECHO_PATH))
        .header(CONTENT_TYPE, "application/json")
        .send()
        .await
        .unwrap();
    let proxy_server_res = proxy_request_client
        .get(format!("https://{addr}{}", ECHO_PATH))
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
        .post(format!("https://{addr}{}", PING_PATH))
        .send()
        .await
        .unwrap();

    let proxy_server_res = proxy_request_client
        .post(format!("https://{addr}{}", PING_PATH))
        .send()
        .await
        .unwrap();

    assert_eq!(
        direct_res.bytes().await.unwrap(),
        proxy_server_res.bytes().await.unwrap()
    );
}
