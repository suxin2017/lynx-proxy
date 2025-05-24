use std::sync::Arc;

use anyhow::{Result, anyhow};
use axum::response::{IntoResponse, Response};
use futures_util::{Sink, SinkExt, Stream, StreamExt};
use http::{Request, Uri, uri::Scheme};
use hyper_tungstenite::HyperWebsocket;
use serde::{Deserialize, Serialize};
use tokio::spawn;
use tokio_tungstenite::{
    MaybeTlsStream, WebSocketStream,
    tungstenite::{self, client::IntoClientRequest},
};
use tracing::{debug, warn};
use ts_rs::TS;

use crate::{
    client::request_client::RequestClientExt,
    common::Req,
    layers::{
        message_package_layer::{MessageEventChannel, MessageEventLayerExt},
        trace_id_layer::service::{TraceId, TraceIdExt},
    },
    utils::{empty, full},
};

struct WebSocketReq(Request<()>);

impl TryFrom<Req> for WebSocketReq {
    type Error = anyhow::Error;

    fn try_from(req: Req) -> Result<Self, Self::Error> {
        let (mut parts, _) = req.into_parts();
        parts.uri = {
            let mut parts = parts.uri.into_parts();
            parts.scheme = if parts.scheme.unwrap_or(Scheme::HTTP) == Scheme::HTTP {
                Some("ws".try_into().expect("Failed to convert scheme"))
            } else {
                Some("wss".try_into().expect("Failed to convert scheme"))
            };
            Uri::from_parts(parts).map_err(|e| anyhow!(e).context("Failed to convert URI"))?
        };
        Ok(WebSocketReq(Request::from_parts(parts, ())))
    }
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

pub async fn proxy_ws_request(mut req: Req) -> anyhow::Result<Response> {
    assert!(hyper_tungstenite::is_upgrade_request(&req));
    let message_channel = req.extensions().get_message_event_cannel();
    let trace_id = req.extensions().get_trace_id();
    let (_res, hyper_ws) = hyper_tungstenite::upgrade(&mut req, None)?;

    message_channel
        .dispatch_on_websocket_start(trace_id.clone())
        .await;

    let ws_client = req.extensions().get_websocket_client();
    let ws_req: WebSocketReq = req.try_into()?;

    let (client_ws, res) = ws_client.request(ws_req).await.inspect_err(|e| {
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
        if let Err(e) = handle_hyper_and_client_websocket(hyper_ws, client_ws, mc, tid).await {
            let reason = format!("WebSocket handling error: {}", e);
            message_channel
                .dispatch_on_websocket_error(trace_id, reason)
                .await;
        }
    });

    let res = res.map(|body| body.map(|b| full(b)).unwrap_or(empty()));
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
    spawn(async move {
        let e = serve_websocket(
            hyper_sink,
            client_stream,
            SendType::ClientToServer,
            mc1,
            tid1,
        )
        .await;
        if let Err(e) = e {
            warn!("Error in client to server websocket: {}", e);
        }
    });

    let mc2 = mc.clone();
    let tid2 = trace_id.clone();
    spawn(async move {
        let e = serve_websocket(
            client_sink,
            hyper_stream,
            SendType::ServerToClient,
            mc2,
            tid2,
        )
        .await;
        if let Err(e) = e {
            warn!("Error in server to client websocket: {}", e);
        }
    });

    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub enum SendType {
    ClientToServer,
    ServerToClient,
}

async fn serve_websocket(
    mut sink: impl Sink<tungstenite::Message, Error = tungstenite::Error> + Unpin + Send,
    mut stream: impl Stream<Item = Result<tungstenite::Message, tungstenite::Error>> + Unpin + Send,
    send_type: SendType,
    mc: Arc<MessageEventChannel>,
    trace_id: TraceId,
) -> Result<()> {
    while let Some(message) = stream.next().await {
        debug!("Received message {:?} {:?}", send_type, message);
        let message = message.map_err(|e| anyhow!(e).context("Failed to receive message"))?;
        mc.dispatch_on_websocket_message(trace_id.clone(), send_type.clone(), &message)
            .await;
        sink.send(message)
            .await
            .map_err(|e| anyhow!(e).context("Failed to send message"))?;
    }

    Ok(())
}
