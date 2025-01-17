use std::{io::Read, net::SocketAddr};

use common::{
    build_proxy_client::build_https_client,
    constant::{PROXY_ROOT_DIR, TEST_ROOT_CA_CERT},
    start_http_server::start_https_server,
    test_server::{ECHO_PATH, GZIP_PATH, HELLO_PATH, PING_PATH},
    tracing_config::init_tracing,
};
use http::header::CONTENT_TYPE;
use proxy_server::{
    cert::{init_ca, CERT_MANAGER},
    server::Server, server_context::set_up_context,
};
use reqwest::Client;
pub mod common;


async fn init_test_server() -> (SocketAddr, Client, Client) {
    let server_context = set_up_context().await;

    let ca_cert_file = &PROXY_ROOT_DIR.join("ca.cert");
    let private_key_file = &PROXY_ROOT_DIR.join("ca.key");
    dbg!(private_key_file);
    let ca_manager = init_ca(ca_cert_file, private_key_file).unwrap();
    CERT_MANAGER.set(ca_manager);

    let addr: std::net::SocketAddr = start_https_server().await.unwrap();
    let proxy_server = Server::new(3000,server_context);
    proxy_server.run().await.unwrap();
    let proxy_addr = format!("http://{}", proxy_server.local_addr);

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
