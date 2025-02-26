use common::{
    build_proxy_client::{build_https_client, build_https_proxy_client},
    start_http_server::start_https_server,
    test_server::HELLO_PATH,
    tracing_config::init_tracing,
};
use lynx_core::{self_service::SSL_CONFIG_SAVE, server::Server, server_context::set_up_context};
use reqwest::Client;
use serde_json::{Value, json};
use std::net::SocketAddr;
pub mod common;

async fn init_test_server() -> (SocketAddr, SocketAddr, Client, Client) {
    init_tracing();
    set_up_context(Default::default()).await;

    let target_addr: std::net::SocketAddr = start_https_server().await.unwrap();
    let mut lynx_core = Server::new(Default::default());
    lynx_core.run().await.unwrap();
    let proxy_addr = *lynx_core.access_addr_list.first().unwrap();

    let direct_request_client = build_https_client();

    let proxy_request_client = build_https_proxy_client(&format!("http://{}", proxy_addr));

    (
        proxy_addr,
        target_addr,
        direct_request_client,
        proxy_request_client,
    )
}

struct SSLTextContext {}

impl SSLTextContext {
    async fn init(proxy_addr: &SocketAddr, client: &Client, value: Value) -> SSLTextContext {
        let res = client
            .post(format!("http://{}{}", proxy_addr, SSL_CONFIG_SAVE))
            .json(&value)
            .send()
            .await
            .unwrap();
        let binding = res.json::<Value>().await.unwrap();
        let code = binding.get("code").unwrap();
        println!("{:?}", binding);
        assert_eq!(code, &json!("Ok"));

        SSLTextContext {}
    }
    async fn destroy(&self, proxy_addr: &SocketAddr, client: &Client) {
        let res = client
            .post(format!("http://{}{}", proxy_addr, SSL_CONFIG_SAVE))
            .json(&json!({
                "captureSSL": false,
                "includeDomains": [],
                "excludeDomains": [],
            }))
            .send()
            .await
            .unwrap();
        let binding = res.json::<Value>().await.unwrap();
        let code = binding.get("code").unwrap();
        assert_eq!(code, &json!("Ok"));
        println!("{:?}", binding);
    }
}

#[tokio::test]
async fn test_ssl_capture() {
    let (proxy_addr, target_addr, client, proxy_request_client) = init_test_server().await;

    let rule = json!({
        "captureSSL": true,
        "includeDomains": [{
            "host": target_addr.ip().to_string(),
            "port": target_addr.port(),
            "switch": true
        }],
        "excludeDomains": [{
            "host": target_addr.ip().to_string(),
            "port": target_addr.port(),
            "switch": true
        }]
    });

    let rule_context = SSLTextContext::init(&proxy_addr, &proxy_request_client, rule).await;

    // proxy request
    let lynx_core_res = proxy_request_client
        .get(format!("https://{target_addr}{HELLO_PATH}"))
        .send()
        .await
        .unwrap();
    // direct request
    let target_res = client
        .get(format!("https://{target_addr}{HELLO_PATH}"))
        .send()
        .await
        .unwrap();
    println!("{:?}", target_res);
    assert_eq!(lynx_core_res.headers(), target_res.headers());
    assert_eq!(
        lynx_core_res.text().await.unwrap(),
        target_res.text().await.unwrap()
    );

    rule_context
        .destroy(&proxy_addr, &proxy_request_client)
        .await;
}
