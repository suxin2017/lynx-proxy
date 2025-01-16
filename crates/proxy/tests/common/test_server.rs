use anyhow::{anyhow, Result};
use async_compression::tokio::bufread::GzipEncoder;
use bytes::{Bytes, BytesMut};
use futures_util::{SinkExt, TryStreamExt};
use http::{
    header::{CONTENT_ENCODING, CONTENT_TYPE},
    Method, StatusCode,
};
use http_body_util::{combinators::BoxBody, BodyDataStream, BodyExt, Full, StreamBody};
use hyper::{
    body::{Body, Frame, Incoming},
    service::service_fn,
    Request, Response,
};
use hyper_util::{
    rt::{TokioExecutor, TokioIo},
    server::conn::auto,
};
use reqwest::Certificate;
use tokio_rustls::{
    rustls::{
        pki_types::{CertificateDer, PrivateKeyDer},
        ServerConfig,
    },
    TlsAcceptor,
};
use tokio_stream::{wrappers::BroadcastStream, StreamExt};
use tracing::info;
use tracing_subscriber::{
    filter::FilterFn, fmt, layer::SubscriberExt, util::SubscriberInitExt, Layer,
};

use std::{
    env,
    fs::{self, File},
    io::{self, Read},
    net::SocketAddr,
    path::PathBuf,
    sync::{mpsc, Arc},
    time::Duration,
};
use tokio::{net::TcpListener, sync::oneshot, time::interval};
use tokio::{sync::broadcast, time::timeout};
use tokio_graceful::Shutdown;
use tokio_tungstenite::tungstenite::Message;
use tokio_util::io::ReaderStream;

pub const HELLO_WORLD: &str = "Hello, World!";
pub const WORLD: &str = "world";

pub const HELLO_PATH: &str = "/hello";
pub const GZIP_PATH: &str = "/gzip";
pub const ECHO_PATH: &str = "/echo";
pub const PING_PATH: &str = "/ping";


pub async fn test_server(
    req: Request<Incoming>,
) -> Result<Response<BoxBody<Bytes, anyhow::Error>>> {
    // websocket
    if hyper_tungstenite::is_upgrade_request(&req) {
        let (res, ws) = hyper_tungstenite::upgrade(req, None)?;

        tokio::spawn(async move {
            let mut ws = ws.await.unwrap();

            while let Some(msg) = ws.next().await {
                let msg = msg.unwrap();
                if msg.is_close() {
                    break;
                }
                ws.send(Message::Text(WORLD.into())).await.unwrap();
            }
        });

        let (parts, body) = res.into_parts();
        let bytes = body.collect().await?.to_bytes();
        let body = Full::new(bytes).map_err(|err| anyhow!("{err}")).boxed();

        return Ok(Response::from_parts(parts, body));
    }

    match (req.method(), req.uri().path()) {
        (&Method::GET, "/hello") => Ok(Response::new(
            Full::new(Bytes::from(HELLO_WORLD))
                .map_err(|err| anyhow!("{err}"))
                .boxed(),
        )),
        (&Method::GET, "/gzip") => {
            let stream_body = StreamBody::new(
                ReaderStream::new(GzipEncoder::new(HELLO_WORLD.as_bytes()))
                    .map_ok(Frame::data)
                    .map_err(|err| anyhow!("{err}")),
            );
            let res = Response::builder()
                .header(CONTENT_ENCODING, "gzip")
                .status(StatusCode::OK)
                .body(BoxBody::new(stream_body))?;
            Ok(res)
        }
        (&Method::POST, "/echo") => {
            let content_type = req.headers().get(CONTENT_TYPE).cloned();
            let bytes = req.collect().await?.to_bytes();
            let body = Full::new(bytes).map_err(|err| anyhow!("{err}")).boxed();
            let mut res = Response::new(body);
            if let Some(content_type) = content_type {
                res.headers_mut().insert(CONTENT_TYPE, content_type);
            }
            Ok(res)
        }
        (&Method::POST, "/ping") => {
            let (tx, mut rx1) = broadcast::channel(16);
            tokio::spawn(async move {
                let mut interval = interval(Duration::from_millis(200));
                let mut count = 0;
                loop {
                    interval.tick().await;
                    if tx.send("pong\n").is_err() {
                        break;
                    }
                    if count > 5 {
                        break;
                    }
                    count += 1;
                }
            });
            let stream = BroadcastStream::new(rx1);
            let stream = stream
                .map_ok(|data| Frame::data(Bytes::from(data)))
                .map_err(|err| anyhow!(err));

            let body = BodyExt::boxed(StreamBody::new(stream));

            let res = Response::new(body);

            Ok(res)
        }
        _ => {
            let mut res = Response::default();
            *res.status_mut() = StatusCode::NOT_FOUND;
            Ok(res)
        }
    }
}
