use anyhow::{Result, anyhow};
use async_compression::tokio::bufread::GzipEncoder;
use bytes::Bytes;
use futures_util::{SinkExt, TryStreamExt};
use http::{
    HeaderValue, Method, StatusCode,
    header::{CONTENT_ENCODING, CONTENT_TYPE},
};
use http_body_util::{BodyExt, Full, StreamBody, combinators::BoxBody};
use hyper::{
    Request, Response,
    body::{Frame, Incoming},
};
use once_cell::sync::Lazy;
use tokio_stream::{StreamExt, wrappers::BroadcastStream};

use std::{sync::Arc, time::Duration};
use tokio::sync::broadcast;
use tokio::time::interval;
use tokio_tungstenite::tungstenite::Message;
use tokio_util::io::ReaderStream;

pub const HELLO_WORLD: &str = "Hello, World!";
pub const WORLD: &str = "world";

pub const HELLO_PATH: &str = "/hello";
pub const GZIP_PATH: &str = "/gzip";
pub const ECHO_PATH: &str = "/echo";
pub const PING_PATH: &str = "/ping";
pub const PUSH_MSG_PATH: &str = "/push_msg";

pub static BOARD_CAST: Lazy<Arc<broadcast::Sender<String>>> = Lazy::new(|| {
    let (tx, _) = broadcast::channel(1);
    let tx = Arc::new(tx);
    let tx1 = Arc::clone(&tx);
    tokio::spawn(async move {
        println!("start push msg");
        let mut interval = interval(Duration::from_millis(1000));
        loop {
            interval.tick().await;
            println!("send msg");
            println!("当前订阅者数量: {}", tx1.receiver_count());
            match tx1.send("push msg\n".to_string()) {
                Ok(_) => {}
                Err(e) => {
                    dbg!(e);
                }
            }
        }
    });
    tx
});

pub async fn test_server(
    req: Request<Incoming>,
    addr: std::net::SocketAddr,
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
        (&Method::GET, "/hello") => {
            let mut res = Response::new(
                Full::new(Bytes::from(HELLO_WORLD))
                    .map_err(|err| anyhow!("{err}"))
                    .boxed(),
            );
            res.headers_mut()
                .append("X-Host", HeaderValue::from_str(&addr.to_string())?);
            Ok(res)
        }
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
            res.headers_mut()
                .insert("X-Host", HeaderValue::from_str(&addr.to_string())?);

            Ok(res)
        }
        (&Method::POST, "/push_msg") => {
            let tx = Arc::clone(&BOARD_CAST);
            let rx = tx.subscribe();
            let stream = BroadcastStream::new(rx);
            let stream = stream
                .map_ok(|data| Frame::data(Bytes::from(data)))
                .map_err(|err| anyhow!(err));

            let body = BodyExt::boxed(StreamBody::new(stream));
            let res = Response::new(body);
            Ok(res)
        }
        (&Method::POST, "/ping") => {
            let mut req_data_stream = req.into_body().into_data_stream();
            let (tx, rx1) = broadcast::channel(16);
            tokio::spawn(async move {
                loop {
                    let data = req_data_stream.next().await;
                    match data {
                        Some(Ok(data)) => {
                            let msg = String::from_utf8(data.to_vec()).unwrap();
                            println!("msg: {:?}", msg);
                            if msg == "ping\n" {
                                match tx.send("pong\n") {
                                    Ok(_) => {}
                                    Err(e) => {
                                        dbg!(e);
                                        break;
                                    }
                                }
                            }
                        }
                        _ => {
                            break;
                        }
                    }
                }
                println!("connect is end")
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
