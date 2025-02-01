use anyhow::anyhow;
use bytes::Bytes;
use common::{
    build_proxy_client::{build_http_client, build_http_proxy_client},
    test_server::{ECHO_PATH, GZIP_PATH, HELLO_PATH, PING_PATH, PUSH_MSG_PATH},
    tracing_config::init_tracing,
};
use futures_util::TryStreamExt;
use http::header::CONTENT_TYPE;
use lynx_core::{
    self_service::{RULE_ADD, RULE_DELETE, RULE_GROUP_ADD, RULE_GROUP_DELETE, RULE_UPDATE},
    server::Server,
    server_context::set_up_context,
};
use reqwest::Client;
use serde_json::{json, Value};
use std::{net::SocketAddr, time::Duration};
use tokio::{sync::broadcast, time::interval};
use tokio_stream::wrappers::BroadcastStream;
pub mod common;

use crate::common::start_http_server::start_http_server;

async fn init_test_server() -> (SocketAddr, Client, Client) {
    init_tracing();
    set_up_context().await;

    let addr: std::net::SocketAddr = start_http_server().await.unwrap();
    let mut lynx_core = Server::new(3000);
    lynx_core.run().await.unwrap();
    let proxy_addr = format!("http://{}", lynx_core.access_addr_list.first().unwrap());

    let direct_request_client = build_http_client();

    let proxy_request_client = build_http_proxy_client(&proxy_addr);

    (addr, direct_request_client, proxy_request_client)
}

struct RuleContext {
    id: Value,
}

impl RuleContext {
    async fn init(addr: &SocketAddr, client: &Client, rule: Value) -> RuleContext {
        let res = client
            .post(format!("http://{addr}{}", RULE_ADD))
            .json(&json!({
                "name": "test",
                // default rule group id
                "ruleGroupId": 1,
            }))
            .send()
            .await
            .unwrap();
        let binding = res.json::<Value>().await.unwrap();
        let _code = binding.get("code").unwrap();

        let data = binding.get("data").unwrap();
        let id = data.get("id").unwrap().clone();

        // set match rule
        let res = client
            .post(format!("http://{addr}{}", RULE_UPDATE))
            .json(&json!({
                "id": id,
                "content": json!({
                    "test": "test"
                })
            }))
            .send()
            .await
            .unwrap();
        let binding = res.json::<Value>().await.unwrap();
        let code = binding.get("code").unwrap();
        assert_eq!(code, &json!("Ok"));
        println!("{:?}", binding);

        RuleContext { id }
    }
    async fn destroy(&self, addr: &SocketAddr, client: &Client) {
        let res = client
            .post(format!("http://{addr}{}", RULE_DELETE))
            .json(&json!({
                "id": self.id,
            }))
            .send()
            .await
            .unwrap();
        let binding = res.json::<Value>().await.unwrap();
        let code = binding.get("code").unwrap();
        println!("{:?}", binding);
        assert_eq!(code, &json!("Ok"));
    }
}


#[tokio::test]
async fn test_rule_proxy() {
    let (addr, client, proxy_request_client) = init_test_server().await;

    let rule = json!({
        "test": "test"
    });

    let rule_context = RuleContext::init(&addr, &proxy_request_client, rule).await;
    
    let lynx_core_res = proxy_request_client
        .get(format!("http://{addr}{HELLO_PATH}"))
        .send()
        .await
        .unwrap();
    tokio::signal::ctrl_c().await.unwrap();
    rule_context.destroy(&addr, &proxy_request_client).await;

}