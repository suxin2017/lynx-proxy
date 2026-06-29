use anyhow::Result;
use futures_util::{SinkExt, StreamExt};
use lynx_core::proxy_server::{
    ProxyServerBuilder, server_ca_manage::ServerCaManagerBuilder,
    server_config::ProxyServerConfigBuilder,
};
use reqwest::StatusCode;
use serde_json::json;
use setup::setup_proxy_server::setup_proxy_server;
use std::path::PathBuf;
use tokio_tungstenite::{connect_async, tungstenite::Message};

mod setup;

async fn setup_auth_server(user: &str, pass: &str) -> Result<lynx_core::proxy_server::ProxyServer> {
    let fixed_temp_dir_path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/temp");
    if !fixed_temp_dir_path.exists() {
        std::fs::create_dir_all(&fixed_temp_dir_path)?;
    }
    let run_dir = fixed_temp_dir_path.join(nanoid::nanoid!());
    std::fs::create_dir_all(&run_dir)?;

    let server_config = ProxyServerConfigBuilder::default()
        .root_cert_file_path(run_dir.join("root.pem"))
        .root_key_file_path(run_dir.join("key.pem"))
        .build()?;

    let server_ca_manager = ServerCaManagerBuilder::new(
        server_config.root_cert_file_path.clone(),
        server_config.root_key_file_path.clone(),
    )
    .build()?;

    let mut proxy_server = ProxyServerBuilder::default()
        .config(std::sync::Arc::new(server_config))
        .server_ca_manager(std::sync::Arc::new(server_ca_manager))
        .data_dir(run_dir.join("db"))
        .auth_user(Some(user.to_string()))
        .auth_pass(Some(pass.to_string()))
        .build()
        .await?;

    proxy_server.run().await?;
    Ok(proxy_server)
}

#[tokio::test]
async fn auth_disabled_allows_certificate_download() -> Result<()> {
    let server = setup_proxy_server(None).await?;
    let addr = server.access_addr_list.first().expect("listen address");
    let client = reqwest::Client::new();
    let response = client
        .get(format!("http://{addr}/api/certificate/download"))
        .send()
        .await?;
    assert_eq!(response.status(), StatusCode::OK);
    Ok(())
}

#[tokio::test]
async fn auth_enabled_blocks_certificate_without_token() -> Result<()> {
    let server = setup_auth_server("admin", "secret").await?;
    let addr = server.access_addr_list.first().expect("listen address");
    let client = reqwest::Client::new();
    let response = client
        .get(format!("http://{addr}/api/certificate/download"))
        .send()
        .await?;
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    Ok(())
}

#[tokio::test]
async fn auth_login_and_access_protected_routes() -> Result<()> {
    let server = setup_auth_server("admin", "secret").await?;
    let addr = server.access_addr_list.first().expect("listen address");
    let client = reqwest::Client::new();

    let login = client
        .post(format!("http://{addr}/api/auth/login"))
        .json(&json!({ "username": "admin", "password": "secret" }))
        .send()
        .await?;
    assert_eq!(login.status(), StatusCode::OK);
    let body: serde_json::Value = login.json().await?;
    let token = body["token"].as_str().expect("token");

    let cert = client
        .get(format!("http://{addr}/api/certificate/download"))
        .header("Authorization", format!("Bearer {token}"))
        .send()
        .await?;
    assert_eq!(cert.status(), StatusCode::OK);

    let ws_url = format!("ws://{addr}/api/net_request/ws/message-events?token={token}");
    let (mut socket, _) = connect_async(&ws_url).await?;
    let request = json!({
        "version": "v1",
        "kind": "request",
        "id": "auth-test",
        "op": "capture.status.get",
        "timestamp": 0,
    });
    socket
        .send(Message::Text(request.to_string().into()))
        .await?;
    let response = socket.next().await.expect("ws response")?.into_text()?;
    let frame: serde_json::Value = serde_json::from_str(&response)?;
    assert_eq!(frame["kind"], "response");
    Ok(())
}

#[tokio::test]
async fn auth_enabled_rejects_ws_without_token() -> Result<()> {
    let server = setup_auth_server("admin", "secret").await?;
    let addr = server.access_addr_list.first().expect("listen address");
    let ws_url = format!("ws://{addr}/api/net_request/ws/message-events");
    let result = connect_async(&ws_url).await;
    assert!(result.is_err());
    Ok(())
}
