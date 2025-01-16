use std::{fs, io::Read, net::SocketAddr, path::Path, slice::Chunks};

use bytes::Bytes;
use common::{
    build_proxy_client::{
        build_http_client, build_http_proxy_client, build_https_client, build_https_proxy_client,
    },
    constant::{PROXY_ROOT_DIR, TEST_LOCALHOST_CERT, TEST_ROOT_CA_CERT},
    start_http_server::start_https_server,
    test_server::{ECHO_PATH, GZIP_PATH, HELLO_PATH, PING_PATH},
    tracing_config::init_tracing,
};
use futures_util::join;
use http::header::CONTENT_TYPE;
use proxy_server::{
    cert::{init_ca, CERT_MANAGER},
    server::Server,
};
use reqwest::Client;
use tracing_subscriber::fmt::format;
pub mod common;

use crate::common::start_http_server::start_http_server;

async fn init_test_server() -> (SocketAddr, Client, Client) {
    let ca_cert_file = &PROXY_ROOT_DIR.join("ca.cert");
    let private_key_file = &PROXY_ROOT_DIR.join("ca.key");
    dbg!(private_key_file);
    let ca_manager = init_ca(ca_cert_file, private_key_file).unwrap();
    CERT_MANAGER.set(ca_manager);

    let addr: std::net::SocketAddr = start_https_server().await.unwrap();
    let proxy_server = Server::new();
    proxy_server.run().await.unwrap();
    let proxy_addr = format!("http://{}", proxy_server.addr);

    let direct_request_client = build_https_client(TEST_ROOT_CA_CERT.clone());

    let proxy_ca_cert =
        reqwest::Certificate::from_pem(CERT_MANAGER.get().unwrap().ca_cert.pem().as_bytes())
            .unwrap();
    let proxy = reqwest::Proxy::all(proxy_addr).unwrap();

    let proxy_request_client = reqwest::Client::builder()
        .no_brotli()
        .no_deflate()
        .no_gzip()
        .use_rustls_tls()
        .add_root_certificate(proxy_ca_cert)
        .proxy(proxy)
        .build()
        .unwrap();

    return (addr, direct_request_client, proxy_request_client);
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
