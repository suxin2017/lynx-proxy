use std::sync::Arc;
use std::time::{Duration, Instant};

use anyhow::Result;
use futures_util::{SinkExt, StreamExt};
use lynx_mock::client::MockClient;
use reqwest_websocket::{Message, RequestBuilderExt};
use setup::{setup_mock_server::setup_mock_server, setup_proxy_server::setup_proxy_server};

mod setup;

fn proxy_url(proxy_server: &lynx_core::proxy_server::ProxyServer) -> String {
    format!(
        "http://{}",
        proxy_server.access_addr_list.first().unwrap()
    )
}

async fn setup_client() -> Result<(lynx_mock::server::MockServer, MockClient)> {
    let mock_server = setup_mock_server().await?;
    let proxy_server =
        setup_proxy_server(Some(Arc::new(vec![mock_server.cert.clone()]))).await?;
    let proxy_server_root_ca = proxy_server.server_ca_manager.ca_cert.clone();
    let client = MockClient::new(
        Some(vec![mock_server.cert.clone(), proxy_server_root_ca]),
        Some(proxy_url(&proxy_server)),
    )?;
    Ok((mock_server, client))
}

fn mock_http_url(mock_server: &lynx_mock::server::MockServer, path: &str) -> String {
    format!("http://{}{}", mock_server.addr, path)
}

#[tokio::test]
async fn proxy_slow_http_exceeds_old_five_second_timeout() -> Result<()> {
    let (mock_server, client) = setup_client().await?;
    let url = mock_http_url(&mock_server, "/timeout");

    let started = Instant::now();
    let response = client
        .get_proxy_client()
        .get(&url)
        .timeout(Duration::from_secs(35))
        .send()
        .await?;
    let elapsed = started.elapsed();

    assert!(response.status().is_success());
    assert_eq!(response.text().await?, "This took a long time");
    assert!(
        elapsed >= Duration::from_secs(9),
        "expected slow response, got {:?}",
        elapsed
    );
    assert!(
        mock_server.addr.port() > 0,
        "mock server should be running"
    );

    Ok(())
}

#[tokio::test]
async fn proxy_websocket_sustained_messages() -> Result<()> {
    let (mock_server, client) = setup_client().await?;
    let ws_url = format!("ws://{}{}", mock_server.addr, "/ws");

    let response = client.proxy_ws(&ws_url).await?;
    let mut ws = response.into_websocket().await?;

    let message_count = 100;
    for i in 0..message_count {
        let payload = format!("sustained-{i}");
        ws.send(Message::Text(payload.clone().into())).await?;
        let reply = ws.next().await.expect("stream ended early")?;
        match reply {
            Message::Text(text) => assert_eq!(text, payload),
            other => panic!("unexpected message: {:?}", other),
        }
    }

    ws.send(Message::Close {
        code: reqwest_websocket::CloseCode::Normal,
        reason: "".into(),
    })
    .await?;

    Ok(())
}

#[tokio::test]
async fn proxy_websocket_with_permessage_deflate_request_header() -> Result<()> {
    let (mock_server, client) = setup_client().await?;
    let ws_url = format!("ws://{}{}", mock_server.addr, "/ws");

    let response = client
        .get_proxy_client()
        .get(&ws_url)
        .header(
            "Sec-WebSocket-Extensions",
            "permessage-deflate; client_max_window_bits",
        )
        .upgrade()
        .send()
        .await?;
    let mut ws = response.into_websocket().await?;

    let message_count = 100;
    for i in 0..message_count {
        let payload = format!("deflate-ext-{i}");
        ws.send(Message::Text(payload.clone().into())).await?;
        let reply = ws.next().await.expect("stream ended early")?;
        match reply {
            Message::Text(text) => assert_eq!(text, payload),
            other => panic!("unexpected message: {:?}", other),
        }
    }

    ws.send(Message::Close {
        code: reqwest_websocket::CloseCode::Normal,
        reason: "".into(),
    })
    .await?;

    Ok(())
}

#[tokio::test]
async fn proxy_websocket_ping_pong_idle() -> Result<()> {
    let (mock_server, client) = setup_client().await?;
    let ws_url = format!("ws://{}{}", mock_server.addr, "/ws");

    let response = client.proxy_ws(&ws_url).await?;
    let mut ws = response.into_websocket().await?;

    for i in 0..20u8 {
        ws.send(Message::Ping(vec![i].into())).await?;
        let reply = ws.next().await.expect("stream ended during idle")?;
        assert!(matches!(reply, Message::Pong(_)));
        tokio::time::sleep(Duration::from_millis(100)).await;
    }

    ws.send(Message::Close {
        code: reqwest_websocket::CloseCode::Normal,
        reason: "".into(),
    })
    .await?;

    Ok(())
}

#[tokio::test]
async fn proxy_slow_response_within_headers_timeout() -> Result<()> {
    let (mock_server, client) = setup_client().await?;
    let url = mock_http_url(&mock_server, "/slow");

    let started = Instant::now();
    let response = client
        .get_proxy_client()
        .get(&url)
        .timeout(Duration::from_secs(35))
        .send()
        .await?;
    let elapsed = started.elapsed();

    assert!(response.status().is_success());
    assert_eq!(response.text().await?, "Slow response");
    assert!(
        elapsed >= Duration::from_secs(2),
        "expected slow response, got {:?}",
        elapsed
    );

    Ok(())
}
