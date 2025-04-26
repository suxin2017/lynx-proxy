use common::tracing_config::init_tracing;
use lynx_core::{
    self_service::paths::SelfServiceRouterPath, server::Server, server_context::set_up_context,
};
use lynx_mock::client::MockClient;
use reqwest::Client;
use serde_json::{Value, json};
use std::{net::SocketAddr, sync::Arc};
pub mod common;

async fn init_test_server() -> (SocketAddr, Arc<Client>) {
    set_up_context(Default::default()).await;

    let mut server = Server::new(Default::default());
    server.run().await.unwrap();
    let client = MockClient::new(None, None).unwrap();
    let c = client.0;
    let cc = c.direct_client.clone();

    (*server.access_addr_list.first().unwrap(), cc)
}

#[tokio::test]
#[ignore]
async fn test_hello() {
    init_tracing();
    let (addr, client) = init_test_server().await;

    let res = client
        .get(format!("http://{addr}{}", SelfServiceRouterPath::Hello))
        .send()
        .await
        .unwrap();

    assert_eq!(res.text().await.unwrap(), "Hello, World!");
}

#[tokio::test]
async fn test_delete_unfound_rule_group() {
    init_tracing();
    let (addr, client) = init_test_server().await;

    let res = client
        .post(format!(
            "http://{addr}{}",
            SelfServiceRouterPath::RuleGroupDelete
        ))
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
async fn test_add_and_delete_rule_group() {
    init_tracing();
    let (addr, client) = init_test_server().await;

    let res = client
        .post(format!(
            "http://{addr}{}",
            SelfServiceRouterPath::RuleGroupAdd
        ))
        .json(&json!({
            "name": "test",
        }))
        .send()
        .await
        .unwrap();
    let binding = res.json::<Value>().await.unwrap();
    let _code = binding.get("code").unwrap();

    let data = binding.get("data").unwrap();
    let id = data.get("id").unwrap();

    let res = client
        .post(format!(
            "http://{addr}{}",
            SelfServiceRouterPath::RuleGroupDelete
        ))
        .json(&json!({
            "id": id,
        }))
        .send()
        .await
        .unwrap();
    let binding = res.json::<Value>().await.unwrap();
    let code = binding.get("code").unwrap();
    assert_eq!(code, &json!("Ok"));
}

#[tokio::test]
async fn test_add_and_delete_rule() {
    init_tracing();
    let (addr, client) = init_test_server().await;

    let res = client
        .post(format!("http://{addr}{}", SelfServiceRouterPath::RuleAdd))
        .json(&json!({
            "name": "test",
            // default rule group id
            "ruleGroupId": 1,
        }))
        .send()
        .await
        .unwrap();
    let binding = res.json::<Value>().await.unwrap();
    let code = binding.get("code").unwrap();
    assert_eq!(code, &json!("Ok"));

    let data = binding.get("data").unwrap();
    let id = data.get("id").unwrap();

    let res = client
        .post(format!(
            "http://{addr}{}",
            SelfServiceRouterPath::RuleUpdateName
        ))
        .json(&json!({
            "id": id,
            "name": "test",
        }))
        .send()
        .await
        .unwrap();
    let binding = res.json::<Value>().await.unwrap();
    let code = binding.get("code").unwrap();
    assert_eq!(code, &json!("Ok"));

    let res = client
        .post(format!(
            "http://{addr}{}",
            SelfServiceRouterPath::RuleUpdateContent
        ))
        .json(&json!({
            "id": id,
            "capture": {
                "type":"glob",
                "url":"http://example.com"
            },
            "handlers":[
                {
                    "type":"connectPassProxyHandler",
                    "data":{
                        "switch":true,
                        "url":"http://example.com"
                    },
                }
            ]
        }))
        .send()
        .await
        .unwrap();
    let binding = res.json::<Value>().await.unwrap();
    let code = binding.get("code").unwrap();
    assert_eq!(code, &json!("Ok"));

    let res = client
        .post(format!(
            "http://{addr}{}",
            SelfServiceRouterPath::RuleDelete
        ))
        .json(&json!({
            "id": id,
        }))
        .send()
        .await
        .unwrap();
    let binding = res.json::<Value>().await.unwrap();
    let code = binding.get("code").unwrap();
    println!("{:?}", binding);
    assert_eq!(code, &json!("Ok"));
}
