use common::{
    build_proxy_client::{build_http_client, build_http_proxy_client},
    test_server::{ECHO_PATH, HELLO_PATH},
    tracing_config::init_tracing,
};
use http::header::CONTENT_TYPE;
use lynx_core::{
    self_service::paths::SelfServiceRouterPath, server::Server, server_context::set_up_context,
};
use reqwest::Client;
use serde_json::{Value, json};
use std::net::SocketAddr;
pub mod common;

use crate::common::start_http_server::start_http_server;

async fn init_test_server() -> (SocketAddr, SocketAddr, SocketAddr, Client, Client) {
    init_tracing();
    set_up_context(Default::default()).await;

    let match_addr: std::net::SocketAddr = start_http_server().await.unwrap();
    let target_addr: std::net::SocketAddr = start_http_server().await.unwrap();
    let mut lynx_core = Server::new(Default::default());
    lynx_core.run().await.unwrap();
    let proxy_addr = *lynx_core.access_addr_list.first().unwrap();

    let direct_request_client = build_http_client();

    let proxy_request_client = build_http_proxy_client(&format!("http://{}", proxy_addr));

    (
        proxy_addr,
        match_addr,
        target_addr,
        direct_request_client,
        proxy_request_client,
    )
}

struct RuleContext {
    id: Value,
}

impl RuleContext {
    async fn init(
        proxy_addr: &SocketAddr,
        match_addr: &SocketAddr,
        target_addr: &SocketAddr,
        client: &Client,
        mut rule: Value,
    ) -> RuleContext {
        let match_domain = format!("http://{}", match_addr);
        let _target_domain = format!("http://{}", target_addr);
        let res = client
            .post(format!(
                "{}{}",
                match_domain,
                SelfServiceRouterPath::RuleAdd
            ))
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

        rule.as_object_mut()
            .unwrap()
            .insert("id".to_string(), id.clone());
        // set match rule
        let res = client
            .post(format!(
                "http://{}{}",
                proxy_addr,
                SelfServiceRouterPath::RuleUpdateContent
            ))
            .json(&rule)
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
            .post(format!(
                "http://{addr}{}",
                SelfServiceRouterPath::RuleDelete
            ))
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
    let (proxy_addr, match_addr, target_addr, client, proxy_request_client) =
        init_test_server().await;

    let match_domain = format!("http://{}", match_addr);
    let target_domain = format!("http://{}", target_addr);

    let rule = json!({
        "capture": {
            "type":"glob",
            "url":format!("{}/**", match_domain)
        },
        "handlers":[
            {
                "type":"connectPassProxyHandler",
                "data":{
                    "switch":true,
                    "url":target_domain
                },
            }
        ]
    });

    let rule_context = RuleContext::init(
        &proxy_addr,
        &match_addr,
        &target_addr,
        &proxy_request_client,
        rule,
    )
    .await;

    // proxy request
    let lynx_core_res = proxy_request_client
        .get(format!("http://{match_addr}{HELLO_PATH}"))
        .send()
        .await
        .unwrap();
    // direct request
    let target_res = client
        .get(format!("http://{target_addr}{HELLO_PATH}"))
        .send()
        .await
        .unwrap();
    assert_eq!(
        lynx_core_res.headers().get("x-host"),
        target_res.headers().get("x-host")
    );
    assert_eq!(
        lynx_core_res.text().await.unwrap(),
        target_res.text().await.unwrap()
    );

    rule_context
        .destroy(&proxy_addr, &proxy_request_client)
        .await;
}

#[test]
fn global_ignore_match() {
    let pattern = "!http://example.com/abc**";
    let result = glob_match::glob_match(pattern, "http://example.com/!abc");
    println!("{:?}", result);
}

#[tokio::test]
async fn test_rule_ignore_proxy() {
    let (proxy_addr, match_addr, target_addr, client, proxy_request_client) =
        init_test_server().await;

    let match_domain = format!("http://{}", match_addr);
    let target_domain = format!("http://{}", target_addr);

    let rule = json!({
        "capture": {
            "type":"glob",
            "url":format!("!{}{}**", match_domain,HELLO_PATH)
        },
        "handlers":[
            {
                "type":"connectPassProxyHandler",
                "data":{
                    "switch":true,
                    "url":target_domain
                },
            }
        ]
    });

    let rule_context = RuleContext::init(
        &proxy_addr,
        &match_addr,
        &target_addr,
        &proxy_request_client,
        rule,
    )
    .await;

    // proxy request
    let lynx_core_res = proxy_request_client
        .get(format!("http://{match_addr}{HELLO_PATH}?a=123"))
        .send()
        .await
        .unwrap();
    // direct request
    let target_res = client
        .get(format!("http://{target_addr}{HELLO_PATH}?a=123"))
        .send()
        .await
        .unwrap();

    assert_ne!(
        lynx_core_res.headers().get("x-host"),
        target_res.headers().get("x-host")
    );

    let lynx_core_res = proxy_request_client
        .post(format!("http://{match_addr}{}", ECHO_PATH))
        .header(CONTENT_TYPE, "application/json")
        .send()
        .await
        .unwrap();
    println!("{:?}", lynx_core_res.headers());
    let target_res = client
        .post(format!("http://{target_addr}{}", ECHO_PATH))
        .header(CONTENT_TYPE, "application/json")
        .send()
        .await
        .unwrap();
    println!("{:?}", target_res.headers());
    assert_eq!(
        lynx_core_res.headers().get("x-host"),
        target_res.headers().get("x-host")
    );
    assert_eq!(
        lynx_core_res.text().await.unwrap(),
        target_res.text().await.unwrap()
    );
    rule_context
        .destroy(&proxy_addr, &proxy_request_client)
        .await;
}
