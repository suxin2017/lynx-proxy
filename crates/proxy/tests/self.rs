use common::{
    build_proxy_client::{build_http_client, build_http_proxy_client},
    test_server::{ECHO_PATH, GZIP_PATH, HELLO_PATH, PING_PATH},
    tracing_config::init_tracing,
};
use futures_util::SinkExt;
use http::header::CONTENT_TYPE;
use proxy_server::{
    self_service::{RULE_GROUP_ADD, RULE_GROUP_DELETE},
    server::Server,
    server_context::set_up_context,
};
use reqwest::Client;
use serde_json::{json, Value};
use std::net::SocketAddr;
pub mod common;

use crate::common::start_http_server::start_http_server;

async fn init_test_server() -> (SocketAddr, Client) {
    let server_context = set_up_context().await;

    let mut server = Server::new(3000, server_context);
    server.run().await.unwrap();
    let client = build_http_client();
    return (server.local_addr, client);
}

#[tokio::test]
async fn test_hello() {
    init_tracing();
    let (addr, client) = init_test_server().await;

    let res = client
        .get(format!("http://{addr}/__self_service_path__/hello"))
        .send()
        .await
        .unwrap();

    assert_eq!(res.text().await.unwrap(), "Hello, World!");
}

#[tokio::test]
async fn test_add_rule_group() {
    init_tracing();
    let (addr, client) = init_test_server().await;

    let res = client
        .post(&format!("http://{addr}{}", RULE_GROUP_ADD))
        .json(&json!({
            "name": "test",

        }))
        .send()
        .await
        .unwrap();
    let binding = res.json::<Value>().await.unwrap();
    let code = binding.get("code").unwrap();

    assert_eq!(code, &json!("Ok"));
}

#[tokio::test]
async fn test_delete_unfound_rule_group() {
    init_tracing();
    let (addr, client) = init_test_server().await;

    let res = client
        .post(&format!("http://{addr}{}", RULE_GROUP_DELETE))
        .json(&json!({
            "id": 9999999,
        }))
        .send()
        .await
        .unwrap();

    let res_json = res.json::<Value>().await.unwrap();
    let code = res_json.get("code").unwrap();
    assert_eq!(code, &json!("OperationError"));
}

#[tokio::test]
async fn test_delete_rule_group() {
    init_tracing();
    let (addr, client) = init_test_server().await;

    let res = client
        .post(&format!("http://{addr}{}", RULE_GROUP_ADD))
        .json(&json!({
            "name": "test",
        }))
        .send()
        .await
        .unwrap();
    let binding = res.json::<Value>().await.unwrap();
    let code = binding.get("code").unwrap();

    let data = binding.get("data").unwrap();
    let id = data.get("id").unwrap();

    let res = client
        .post(&format!("http://{addr}{}", RULE_GROUP_DELETE))
        .json(&json!({
            "id": id,
        }))
        .send()
        .await
        .unwrap();
    let binding = res.json::<Value>().await.unwrap();
    let code = binding.get("code").unwrap();
    assert_eq!(code, &json!("Ok"));
    tokio::signal::ctrl_c().await.unwrap();
}
