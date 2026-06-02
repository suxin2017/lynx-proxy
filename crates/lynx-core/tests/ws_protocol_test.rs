use anyhow::Result;
use futures_util::{SinkExt, StreamExt};
use serde_json::json;
use setup::setup_self_service_test_server::setup_self_service_test_server;
use tokio_tungstenite::{connect_async, tungstenite::Message};

mod setup;

#[tokio::test]
async fn ws_capture_status_get() -> Result<()> {
    let (server, _client) = setup_self_service_test_server().await?;
    let addr = server
        .access_addr_list
        .first()
        .expect("proxy listen address");

    let ws_url = format!("ws://{addr}/api/net_request/ws/message-events");
    let (mut socket, _) = connect_async(&ws_url).await?;

    let request = json!({
        "version": "v1",
        "kind": "request",
        "id": "test-1",
        "op": "capture.status.get",
        "timestamp": 0,
    });
    socket
        .send(Message::Text(request.to_string().into()))
        .await?;

    let response = socket
        .next()
        .await
        .expect("ws response")?
        .into_text()?;

    let frame: serde_json::Value = serde_json::from_str(&response)?;
    assert_eq!(frame["kind"], "response");
    assert_eq!(frame["op"], "capture.status.get");
    assert!(frame["payload"]["recordingStatus"].is_string());

    Ok(())
}

#[tokio::test]
async fn ws_settings_general_get() -> Result<()> {
    let (server, _client) = setup_self_service_test_server().await?;
    let addr = server
        .access_addr_list
        .first()
        .expect("proxy listen address");

    let ws_url = format!("ws://{addr}/api/net_request/ws/message-events");
    let (mut socket, _) = connect_async(&ws_url).await?;

    let request = json!({
        "version": "v1",
        "kind": "request",
        "id": "test-settings",
        "op": "settings.general.get",
        "timestamp": 0,
    });
    socket
        .send(Message::Text(request.to_string().into()))
        .await?;

    let response = socket
        .next()
        .await
        .expect("ws response")?
        .into_text()?;

    let frame: serde_json::Value = serde_json::from_str(&response)?;
    assert_eq!(frame["kind"], "response");
    assert_eq!(frame["op"], "settings.general.get");
    assert!(frame["payload"]["maxLogSize"].is_number());

    Ok(())
}

#[tokio::test]
async fn ws_rules_list_get() -> Result<()> {
    let (server, _client) = setup_self_service_test_server().await?;
    let addr = server
        .access_addr_list
        .first()
        .expect("proxy listen address");

    let ws_url = format!("ws://{addr}/api/net_request/ws/message-events");
    let (mut socket, _) = connect_async(&ws_url).await?;

    let request = json!({
        "version": "v1",
        "kind": "request",
        "id": "test-rules",
        "op": "rules.list.get",
        "timestamp": 0,
    });
    socket
        .send(Message::Text(request.to_string().into()))
        .await?;

    let response = socket
        .next()
        .await
        .expect("ws response")?
        .into_text()?;

    let frame: serde_json::Value = serde_json::from_str(&response)?;
    assert_eq!(frame["kind"], "response");
    assert_eq!(frame["op"], "rules.list.get");
    assert!(frame["payload"]["rules"].is_array());

    Ok(())
}
