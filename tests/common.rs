use anyhow::{anyhow, Result};
use bytes::{Bytes, BytesMut};
use futures_util::SinkExt;
use http::{
    header::{CONTENT_ENCODING, CONTENT_TYPE},
    Method, StatusCode,
};
use http_body_util::{combinators::BoxBody, BodyExt, Full, StreamBody};
use hyper::{
    body::{Frame, Incoming},
    service::service_fn,
    Request, Response,
};
use hyper_util::{
    rt::{TokioExecutor, TokioIo},
    server::conn::auto,
};
use proxy_rust::server::Server;
use tokio_stream::StreamExt;
use tracing_subscriber::{
    filter::FilterFn, fmt, layer::SubscriberExt, util::SubscriberInitExt, Layer,
};

use std::{net::SocketAddr, path::PathBuf, sync::Arc, time::Duration};
use tokio::time::timeout;
use tokio::{net::TcpListener, sync::oneshot};
use tokio_graceful::Shutdown;
use tokio_tungstenite::tungstenite::Message;
use tokio_util::io::ReaderStream;

pub const HELLO_WORLD: &str = "Hello, World!";
pub const WORLD: &str = "world";

async fn test_server(req: Request<Incoming>) -> Result<Response<BoxBody<Bytes, anyhow::Error>>> {
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
        // (&Method::GET, "/hello/gzip") => {
        //     let stream_body = StreamBody::new(
        //         ReaderStream::new(GzipEncoder::new(HELLO_WORLD.as_bytes()))
        //             .map_ok(Frame::data)
        //             .map_err(|err| anyhow!("{err}")),
        //     );
        //     let res = Response::builder()
        //         .header(CONTENT_ENCODING, "gzip")
        //         .status(StatusCode::OK)
        //         .body(BoxBody::new(stream_body))?;
        //     Ok(res)
        // }
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
        _ => {
            let mut res = Response::default();
            *res.status_mut() = StatusCode::NOT_FOUND;
            Ok(res)
        }
    }
}

pub async fn start_proxy() -> Result<()> {
    Server {}.run().await?;
    Ok(())
}

pub async fn start_http_server() -> Result<(SocketAddr, oneshot::Sender<()>)> {
    let listener = TcpListener::bind(SocketAddr::from(([127, 0, 0, 1], 0))).await?;
    let addr = listener.local_addr()?;
    let (tx, rx) = oneshot::channel();
    println!("start test server at 127.0.0.1:0");

    tokio::spawn(async move {
        let server = auto::Builder::new(TokioExecutor::new());
        let shutdown = Shutdown::new(async { rx.await.unwrap_or_default() });
        let guard = shutdown.guard_weak();

        loop {
            tokio::select! {
                res = listener.accept() => {
                    let Ok((tcp, _)) = res else {
                        continue;
                    };

                    let server = server.clone();

                    shutdown.spawn_task(async move {
                        let _ = server
                            .serve_connection_with_upgrades(TokioIo::new(tcp), service_fn(test_server))
                            .await;
                    });
                }
                _ = guard.cancelled() => {
                    break;
                }
            }
        }

        shutdown.shutdown().await;
    });

    Ok((addr, tx))
}

pub fn build_proxy_client(proxy: &str) -> Result<reqwest::Client> {
    let proxy = reqwest::Proxy::all(proxy)?;

    let client = reqwest::Client::builder()
        .proxy(proxy)
        .no_brotli()
        .no_deflate()
        .no_gzip()
        .build()?;

    Ok(client)
}

pub fn init_tracing() {
    let my_filter = FilterFn::new(|metadata| {
        // Only enable spans or events with the target "interesting_things"
        {
            metadata.target().starts_with("proxy_rust")
        }
    });
    tracing_subscriber::registry()
        .with(fmt::layer().with_filter(my_filter))
        .init();
}
