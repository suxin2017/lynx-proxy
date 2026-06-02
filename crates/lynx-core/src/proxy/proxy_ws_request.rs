use std::sync::Arc;

use anyhow::{Result, anyhow};
use axum::response::{IntoResponse, Response};
use http_body_util::BodyExt;
use futures_util::{Sink, SinkExt, Stream, StreamExt};
use http::{
    Request, Uri,
    header::{HeaderValue, SEC_WEBSOCKET_EXTENSIONS, SEC_WEBSOCKET_KEY, SEC_WEBSOCKET_PROTOCOL},
};
use hyper_tungstenite::HyperWebsocket;
use serde::{Deserialize, Serialize};
use tokio::spawn;
use tokio_tungstenite::{
    MaybeTlsStream, WebSocketStream,
    tungstenite::{self, client::IntoClientRequest},
};
use tower::{ServiceBuilder, ServiceExt, service_fn};
use tracing::{debug, instrument, warn};

use crate::{
    client::request_client::RequestClientExt,
    common::Req,
    layers::{
        message_package_layer::{MessageEventChannel, MessageEventLayerExt},
        request_processing_layer::RequestProcessingService,
        trace_id_layer::service::{TraceId, TraceIdExt},
    },
    utils::full,
};

#[derive(Debug, Clone)]
struct WebSocketReq(Request<()>);

fn normalize_websocket_uri(uri: Uri) -> Result<Uri> {
    let mut parts = uri.into_parts();

    let scheme_str = parts.scheme.as_ref().map(|s| s.as_str());
    parts.scheme = Some(match scheme_str {
        Some("http") => "ws".try_into().expect("valid ws scheme"),
        Some("https") | Some("wss") => "wss".try_into().expect("valid wss scheme"),
        Some("ws") => "ws".try_into().expect("valid ws scheme"),
        Some(other) => other.try_into().map_err(|_| anyhow!("invalid scheme: {other}"))?,
        None => "ws".try_into().expect("valid ws scheme"),
    });

    if let Some(authority) = parts.authority.as_ref() {
        let strip_default_port = matches!(
            (parts.scheme.as_ref().map(|s| s.as_str()), authority.port_u16()),
            (Some("ws"), Some(80))
                | (Some("wss"), Some(443))
                | (Some("http"), Some(80))
                | (Some("https"), Some(443))
        );
        if strip_default_port {
            let host = authority.host();
            parts.authority = Some(
                host.parse::<http::uri::Authority>()
                    .map_err(|e| anyhow!(e).context("failed to normalize websocket authority"))?,
            );
        }
    }

    Uri::from_parts(parts).map_err(|e| anyhow!(e).context("failed to build websocket URI"))
}

/// Build an upstream handshake request: independent key, no extension/protocol forwarding.
fn prepare_upstream_websocket_request(req: Req) -> Result<WebSocketReq> {
    let (mut parts, _) = req.into_parts();

    parts.headers.remove(SEC_WEBSOCKET_EXTENSIONS);
    parts.headers.remove(SEC_WEBSOCKET_PROTOCOL);

    let key = tungstenite::handshake::client::generate_key();
    parts.headers.insert(
        SEC_WEBSOCKET_KEY,
        HeaderValue::from_str(&key)
            .map_err(|e| anyhow!(e).context("invalid generated websocket key"))?,
    );

    parts.uri = normalize_websocket_uri(parts.uri)?;
    Ok(WebSocketReq(Request::from_parts(parts, ())))
}

impl IntoClientRequest for WebSocketReq {
    fn into_client_request(
        self,
    ) -> tokio_tungstenite::tungstenite::Result<
        tokio_tungstenite::tungstenite::handshake::client::Request,
    > {
        self.0.into_client_request()
    }
}

pub fn is_websocket_req(req: &Req) -> bool {
    hyper_tungstenite::is_upgrade_request(req)
}

async fn proxy_ws_inner(mut req: Req) -> Result<Response> {
    assert!(hyper_tungstenite::is_upgrade_request(&req));
    let message_channel = req.extensions().try_get_message_event_cannel()?;
    let trace_id = req.extensions().get_trace_id();
    let (client_res, hyper_ws) = hyper_tungstenite::upgrade(&mut req, None)?;

    message_channel
        .dispatch_on_websocket_start(trace_id.clone())
        .await;

    let ws_client = req.extensions().try_get_websocket_client()?;
    let ws_req = prepare_upstream_websocket_request(req)?;

    let (client_ws, _upstream_res) = ws_client.request(ws_req).await.inspect_err(|e| {
        let message_channel = message_channel.clone();
        let trace_id = trace_id.clone();
        let reason = format!("WebSocket request error: {}", e);
        spawn(async move {
            message_channel
                .dispatch_on_websocket_error(trace_id, reason)
                .await;
        });
    })?;

    let mc = message_channel.clone();
    let tid = trace_id.clone();
    spawn(async move {
        match handle_hyper_and_client_websocket(hyper_ws, client_ws, mc.clone(), tid.clone()).await
        {
            Ok(()) => {
                mc.dispatch_on_websocket_end(tid).await;
            }
            Err(e) => {
                let reason = format!("WebSocket handling error: {}", e);
                mc.dispatch_on_websocket_error(tid, reason).await;
            }
        }
    });

    let (parts, body) = client_res.into_parts();
    let bytes = body.collect().await?.to_bytes();
    let client_res = Response::from_parts(parts, full(bytes));
    Ok(client_res.into_response())
}

#[instrument(skip_all)]
pub async fn proxy_ws_request(req: Req) -> anyhow::Result<Response> {
    let svc = service_fn(proxy_ws_inner);

    let svc = ServiceBuilder::new()
        .layer_fn(|s| RequestProcessingService { service: s })
        .service(svc);

    let res = svc.oneshot(req).await?;
    Ok(res.into_response())
}

async fn handle_hyper_and_client_websocket<S>(
    hyper_ws: HyperWebsocket,
    client_ws: WebSocketStream<MaybeTlsStream<S>>,
    mc: Arc<MessageEventChannel>,
    trace_id: TraceId,
) -> anyhow::Result<()>
where
    S: tokio::io::AsyncRead + tokio::io::AsyncWrite + Unpin + Send + 'static,
{
    let hyper_ws_stream = hyper_ws.await?;

    let (hyper_sink, hyper_stream) = hyper_ws_stream.split();
    let (client_sink, client_stream) = client_ws.split();

    let mc1 = mc.clone();
    let tid1 = trace_id.clone();
    let upstream_to_client = relay_websocket_direction(
        hyper_sink,
        client_stream,
        SendType::ClientToServer,
        mc1,
        tid1,
        "upstream-to-client",
    );

    let mc2 = mc.clone();
    let tid2 = trace_id.clone();
    let client_to_upstream = relay_websocket_direction(
        client_sink,
        hyper_stream,
        SendType::ServerToClient,
        mc2,
        tid2,
        "client-to-upstream",
    );

    let (res_upstream, res_client) = tokio::join!(upstream_to_client, client_to_upstream);

    if let Err(e) = res_upstream {
        warn!(
            direction = "upstream-to-client",
            "websocket relay ended: {:#}",
            e
        );
    }
    if let Err(e) = res_client {
        warn!(
            direction = "client-to-upstream",
            "websocket relay ended: {:#}",
            e
        );
    }

    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SendType {
    ClientToServer,
    ServerToClient,
}

fn should_capture_websocket_message(message: &tungstenite::Message) -> bool {
    !matches!(
        message,
        tungstenite::Message::Ping(_) | tungstenite::Message::Pong(_)
    )
}

fn format_websocket_receive_error(error: &tungstenite::Error) -> String {
    match error {
        tungstenite::Error::ConnectionClosed => "connection closed".to_string(),
        tungstenite::Error::AlreadyClosed => "already closed".to_string(),
        tungstenite::Error::Protocol(proto) => format!("protocol error: {proto}"),
        other => format!("{other}"),
    }
}

async fn relay_websocket_direction<Si, St>(
    mut sink: Si,
    mut stream: St,
    send_type: SendType,
    mc: Arc<MessageEventChannel>,
    trace_id: TraceId,
    direction: &'static str,
) -> Result<()>
where
    Si: Sink<tungstenite::Message, Error = tungstenite::Error> + Unpin + Send,
    St: Stream<Item = Result<tungstenite::Message, tungstenite::Error>> + Unpin + Send,
{
    while let Some(message) = stream.next().await {
        let message = match message {
            Ok(message) => message,
            Err(error) => {
                return Err(anyhow!(format_websocket_receive_error(&error))
                    .context(format!("{direction}: failed to receive message")));
            }
        };

        debug!("Received message {:?} {:?}", send_type, message);

        if let tungstenite::Message::Close(frame) = &message {
            let (code, reason) = frame
                .as_ref()
                .map(|f| (f.code.to_string(), f.reason.to_string()))
                .unwrap_or_else(|| ("none".to_string(), String::new()));
            debug!(
                direction,
                ?send_type, code, reason, "websocket close frame received"
            );
        }

        sink.send(message.clone())
            .await
            .map_err(|e| anyhow!(e).context(format!("{direction}: failed to send message")))?;

        if should_capture_websocket_message(&message) {
            mc.spawn_websocket_message_capture(trace_id.clone(), send_type.clone(), message);
        }
    }

    if let Err(e) = sink.close().await {
        debug!(direction, "websocket sink close: {:?}", e);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use http::Uri;

    #[test]
    fn normalize_websocket_uri_strips_default_ports() {
        let uri: Uri = "https://example.com:443/chat".parse().unwrap();
        let normalized = normalize_websocket_uri(uri).unwrap();
        assert_eq!(normalized.to_string(), "wss://example.com/chat");

        let uri: Uri = "http://example.com:80/chat".parse().unwrap();
        let normalized = normalize_websocket_uri(uri).unwrap();
        assert_eq!(normalized.to_string(), "ws://example.com/chat");
    }

    #[test]
    fn normalize_websocket_uri_keeps_non_default_port() {
        let uri: Uri = "https://example.com:8443/chat".parse().unwrap();
        let normalized = normalize_websocket_uri(uri).unwrap();
        assert_eq!(normalized.to_string(), "wss://example.com:8443/chat");
    }
}
