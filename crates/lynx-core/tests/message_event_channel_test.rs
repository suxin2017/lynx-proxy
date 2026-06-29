use std::sync::Arc;
use std::time::Duration;

use anyhow::Result;
use futures_util::{SinkExt, StreamExt};
use lynx_storage::dao::https_capture_dao::{CaptureFilter, HttpsCaptureDao};
use serde_json::json;
use setup::{setup_mock_server::setup_mock_server, setup_proxy_server::setup_proxy_server};
use tokio::time::timeout;
use tokio_tungstenite::{connect_async, tungstenite::Message};

mod setup;

async fn next_ws_text(
    socket: &mut tokio_tungstenite::WebSocketStream<
        tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>,
    >,
) -> Result<String> {
    match timeout(Duration::from_secs(5), socket.next()).await {
        Ok(Some(Ok(message))) => Ok(message.into_text()?.to_string()),
        Ok(Some(Err(err))) => Err(err.into()),
        Ok(None) => Err(anyhow::anyhow!("websocket closed")),
        Err(_) => Err(anyhow::anyhow!("websocket read timeout")),
    }
}

fn proxy_url(proxy_server: &lynx_core::proxy_server::ProxyServer, addr_index: usize) -> String {
    format!(
        "http://{}",
        proxy_server
            .access_addr_list
            .get(addr_index)
            .expect("listen address")
    )
}

#[tokio::test]
async fn shared_channel_delivers_proxied_request_events() -> Result<()> {
    let mock_server = setup_mock_server().await?;
    let proxy_server = setup_proxy_server(Some(Arc::new(vec![mock_server.cert.clone()]))).await?;

    HttpsCaptureDao::new(proxy_server.data_store.clone())
        .update_capture_filter(CaptureFilter {
            enabled: true,
            include_domains: vec![],
            exclude_domains: vec![],
        })
        .await?;

    let proxy_addr = proxy_url(&proxy_server, 0);
    let client = lynx_mock::client::MockClient::new(
        Some(vec![
            mock_server.cert.clone(),
            proxy_server.server_ca_manager.ca_cert.clone(),
        ]),
        Some(proxy_addr),
    )?;

    let mut event_rx = proxy_server.message_event_channel().subscribe();

    let http_path = mock_server.get_http_mock_paths()[0].clone();
    let (_, proxy_res) = client.get(http_path.as_str()).await;
    proxy_res?;

    let event = timeout(Duration::from_secs(5), event_rx.recv())
        .await
        .map_err(|_| anyhow::anyhow!("timed out waiting for capture event"))??;

    match event {
        lynx_core::layers::message_package_layer::message_event_store::MessageEvent::OnRequestStart(
            _,
            req,
        ) => {
            assert_eq!(req.method, "GET");
            assert!(req.url.contains("http"));
        }
        other => panic!("expected OnRequestStart, got {:?}", other),
    }

    Ok(())
}

#[tokio::test]
async fn ws_stream_receives_events_when_traffic_uses_other_listen_address() -> Result<()> {
    let mock_server = setup_mock_server().await?;
    let proxy_server = setup_proxy_server(Some(Arc::new(vec![mock_server.cert.clone()]))).await?;

    let addrs = &proxy_server.access_addr_list;
    if addrs.len() < 2 {
        eprintln!(
            "skip ws_stream_receives_events_when_traffic_uses_other_listen_address: need 2+ listen addresses, got {}",
            addrs.len()
        );
        return Ok(());
    }

    HttpsCaptureDao::new(proxy_server.data_store.clone())
        .update_capture_filter(CaptureFilter {
            enabled: true,
            include_domains: vec![],
            exclude_domains: vec![],
        })
        .await?;

    let traffic_proxy = proxy_url(&proxy_server, 0);
    let client = lynx_mock::client::MockClient::new(
        Some(vec![
            mock_server.cert.clone(),
            proxy_server.server_ca_manager.ca_cert.clone(),
        ]),
        Some(traffic_proxy),
    )?;

    let ws_addr = addrs[1];
    let ws_url = format!("ws://{ws_addr}/api/net_request/ws/message-events");
    let (mut socket, _) = connect_async(&ws_url).await?;

    let subscribe = json!({
        "version": "v1",
        "kind": "request",
        "id": "subscribe-1",
        "op": "request.stream.subscribe",
        "timestamp": 0,
    });
    socket
        .send(Message::Text(subscribe.to_string().into()))
        .await?;

    let subscribe_response = next_ws_text(&mut socket).await?;
    let subscribe_frame: serde_json::Value = serde_json::from_str(&subscribe_response)?;
    assert_eq!(subscribe_frame["kind"], "response");
    assert_eq!(subscribe_frame["op"], "request.stream.subscribe");

    let http_path = mock_server.get_http_mock_paths()[0].clone();
    let (_, proxy_res) = client.get(http_path.as_str()).await;
    proxy_res?;

    let mut saw_request_start = false;
    for _ in 0..32 {
        let msg = next_ws_text(&mut socket).await?;
        let frame: serde_json::Value = serde_json::from_str(&msg)?;
        if frame["kind"] == "event" && frame["op"] == "request.start" {
            saw_request_start = true;
            break;
        }
    }

    assert!(
        saw_request_start,
        "UI WS on {ws_addr} should receive request.start from traffic via {}",
        addrs[0]
    );

    Ok(())
}
