use anyhow::{Error, Result, anyhow};
use futures_util::{Sink, SinkExt, Stream, StreamExt};
use http::Uri;
use http::uri::Scheme;
use http_body_util::BodyExt;
use http_body_util::combinators::BoxBody;
use hyper::body::{Bytes, Incoming};
use hyper::{Request, Response};
use hyper_tungstenite::HyperWebsocket;
use hyper_util::rt::TokioIo;
use jsonschema::error;
use tokio::spawn;
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::{WebSocketStream, tungstenite};
use tracing::error;

use crate::utils::empty;

pub async fn websocket_proxy(
    req: Request<Incoming>,
) -> anyhow::Result<Response<BoxBody<Bytes, Error>>> {
    let mut req = req.map(|_| ());

    let (res, client_to_server_socket) = hyper_tungstenite::upgrade(&mut req, None)?;

    let (mut parts, _) = req.into_parts();
    parts.uri = {
        let mut parts = parts.uri.into_parts();
        parts.scheme = if parts.scheme.unwrap_or(Scheme::HTTP) == Scheme::HTTP {
            Some("ws".try_into().expect("Failed to convert scheme"))
        } else {
            Some("wss".try_into().expect("Failed to convert scheme"))
        };
        Uri::from_parts(parts)?
    };

    spawn(async move {
        match client_to_server_socket.await {
            Ok(client_to_server_socket) => {
                let proxy_req = Request::from_parts(parts, ());
                match tokio_tungstenite::connect_async(proxy_req).await {
                    Ok((server_to_client_socket, _)) => {
                        let (client_sink, client_stream) = client_to_server_socket.split();
                        let (server_sink, server_stream) = server_to_client_socket.split();
                        spawn(serve_websocket(server_sink, client_stream));
                        spawn(serve_websocket(client_sink, server_stream));
                    }
                    Err(e) => {
                        error!("create websocket connect error {:?}", e);
                    }
                }
            }
            Err(e) => {
                error!("handle websocket connect error: {:?}", e);
            }
        }
    });

    let (parts, body) = res.into_parts();
    let body: BoxBody<Bytes, Error> = body.map_err(|never| anyhow!(never)).boxed();
    Ok(Response::from_parts(parts, body))
}

/// Handle a websocket connection.
async fn serve_websocket(
    mut sink: impl Sink<tungstenite::Message, Error = tungstenite::Error> + Unpin + Send,
    mut stream: impl Stream<Item = Result<tungstenite::Message, tungstenite::Error>> + Unpin + Send,
) -> Result<()> {
    while let Some(message) = stream.next().await {
        let message = message?;
        sink.send(message).await?;
    }
    Ok(())
}
