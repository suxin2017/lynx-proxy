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
use tracing::debug;
use ts_rs::TS;

use crate::{
    client::request_client::RequestClientExt,
    common::HyperReq,
    utils::{empty, full},
};

struct WebSocketReq(Request<()>);

impl TryFrom<HyperReq> for WebSocketReq {
    type Error = anyhow::Error;

    fn try_from(req: HyperReq) -> Result<Self, Self::Error> {
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

pub fn is_websocket_req(req: &HyperReq) -> bool {
    hyper_tungstenite::is_upgrade_request(req)
}

pub async fn proxy_ws_request(mut req: HyperReq) -> anyhow::Result<Response> {
    assert!(hyper_tungstenite::is_upgrade_request(&req));
    let (_res, hyper_ws) = hyper_tungstenite::upgrade(&mut req, None)?;

    let ws_client = req.extensions().get_websocket_client();
    let ws_req: WebSocketReq = req.try_into()?;
    let (client_ws, res) = ws_client.request(ws_req).await?;

    spawn(async move {
        let _ = handle_hyper_and_client_websocket(hyper_ws, client_ws).await;
    });

    let res = res.map(|body| body.map(|b| full(b)).unwrap_or(empty()));
    Ok(res.into_response())
}

async fn handle_hyper_and_client_websocket<S>(
    hyper_ws: HyperWebsocket,
    client_ws: WebSocketStream<MaybeTlsStream<S>>,
) -> anyhow::Result<()>
where
    S: tokio::io::AsyncRead + tokio::io::AsyncWrite + Unpin + Send + 'static,
{
    let hyper_ws_stream = hyper_ws.await?;

    let (hyper_sink, hyper_stream) = hyper_ws_stream.split();
    let (client_sink, client_stream) = client_ws.split();

    spawn(async move {
        let e = serve_websocket(hyper_sink, client_stream, SendType::ClientToServer).await;
        if let Err(e) = e {
            debug!("Error in client to server websocket: {:?}", e);
        }
    });
    spawn(async move {
        let e = serve_websocket(client_sink, hyper_stream, SendType::ServerToClient).await;
        if let Err(e) = e {
            debug!("Error in server to client websocket: {:?}", e);
        }
    });

    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
enum SendType {
    ClientToServer,
    ServerToClient,
}

async fn serve_websocket(
    mut sink: impl Sink<tungstenite::Message, Error = tungstenite::Error> + Unpin + Send,
    mut stream: impl Stream<Item = Result<tungstenite::Message, tungstenite::Error>> + Unpin + Send,
    _send_type: SendType,
) -> Result<()> {
    while let Some(message) = stream.next().await {
        debug!("Received message: {:?}", message);
        let message = message.map_err(|e| anyhow!(e).context("Failed to receive message"))?;

        sink.send(message)
            .await
            .map_err(|e| anyhow!(e).context("Failed to send message"))?;
    }

    Ok(())
}
