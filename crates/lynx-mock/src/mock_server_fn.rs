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
use hyper_tungstenite::tungstenite::Message;
use once_cell::sync::Lazy;
use tokio_stream::{StreamExt, wrappers::BroadcastStream};
use tracing::{info, instrument, trace};

use std::{fmt::Display, time::Duration};
use tokio::sync::broadcast;
use tokio::time::interval;
use tokio_util::io::ReaderStream;

pub const HELLO_WORLD: &str = "Hello, World!";

pub const HELLO_PATH: &str = "/hello";
pub const GZIP_PATH: &str = "/gzip";
pub const ECHO_PATH: &str = "/echo";
pub const WEBSOCKET_PATH: &str = "/ws";
pub const PUSH_MSG_PATH: &str = "/push_msg";

pub enum MockPath {
    Hello,
    Gzip,
    Echo,
    PushMsg,
    Websocket,
    NotFound,
}

pub static HTTP_PATH_LIST: [MockPath; 4] = [
    MockPath::Hello,
    MockPath::Gzip,
    MockPath::Echo,
    MockPath::PushMsg,
];

pub static WS_PATH: MockPath = MockPath::Websocket;

impl From<&str> for MockPath {
    fn from(value: &str) -> Self {
        match value {
            HELLO_PATH => MockPath::Hello,
            GZIP_PATH => MockPath::Gzip,
            ECHO_PATH => MockPath::Echo,
            PUSH_MSG_PATH => MockPath::PushMsg,
            WEBSOCKET_PATH => MockPath::Websocket,
            _ => MockPath::NotFound,
        }
    }
}

impl Display for MockPath {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            MockPath::Hello => write!(f, "{}", HELLO_PATH),
            MockPath::Gzip => write!(f, "{}", GZIP_PATH),
            MockPath::Echo => write!(f, "{}", ECHO_PATH),
            MockPath::PushMsg => write!(f, "{}", PUSH_MSG_PATH),
            MockPath::Websocket => write!(f, "{}", WEBSOCKET_PATH),
            MockPath::NotFound => write!(f, "/"),
        }
    }
}

#[instrument(skip(req))]
pub async fn mock_server_fn(
    req: Request<Incoming>,
) -> Result<Response<BoxBody<Bytes, anyhow::Error>>> {
    tracing::trace!("{:?}", req);
    let res = match (req.method(), MockPath::from(req.uri().path())) {
        (&Method::GET, MockPath::Websocket) => {
            let (res, ws) = hyper_tungstenite::upgrade(req, None)?;

            tokio::spawn(async move {
                let mut ws = ws.await.unwrap();

                while let Some(msg) = ws.next().await {
                    trace!("websocket msg: {:?}", msg);
                    match msg.unwrap() {
                        Message::Binary(data) => {
                            ws.send(Message::Binary(data)).await.unwrap();
                        }
                        Message::Text(data) => {
                            ws.send(Message::Text(data)).await.unwrap();
                        }
                        Message::Ping(data) => {
                            ws.send(Message::Pong(data)).await.unwrap();
                        }
                        Message::Pong(_) => {}
                        Message::Close(_) => {}
                        _ => {}
                    }
                }
            });

            let (parts, body) = res.into_parts();
            let bytes = body.collect().await?.to_bytes();
            let body = Full::new(bytes).map_err(|err| anyhow!("{err}")).boxed();
            let res_result = Response::from_parts(parts, body);
            Ok(res_result)
        }
        (&Method::GET, MockPath::Hello) => {
            let res = Response::new(
                Full::new(Bytes::from(HELLO_WORLD))
                    .map_err(|err| anyhow!("{err}"))
                    .boxed(),
            );
            Ok(res)
        }
        (&Method::GET, MockPath::Gzip) => {
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
        (&Method::GET, MockPath::Echo) => {
            let content_type = req.headers().get(CONTENT_TYPE).cloned();
            let bytes = req.collect().await?.to_bytes();
            let body = Full::new(bytes).map_err(|err| anyhow!("{err}")).boxed();
            let mut res = Response::new(body);
            if let Some(content_type) = content_type {
                res.headers_mut().insert(CONTENT_TYPE, content_type);
            }

            Ok(res)
        }
        (&Method::GET, MockPath::PushMsg) => {
            let (tx, rx) = broadcast::channel(1);
            tokio::spawn(async move {
                let mut interval = interval(Duration::from_millis(200));
                let mut count = 0;
                loop {
                    count += 1;
                    if count > 10 {
                        break;
                    }
                    interval.tick().await;
                    match tx.send("push msg\n".to_string()) {
                        Ok(_) => {}
                        Err(e) => {
                            dbg!(e);
                        }
                    }
                }
            });
            let stream = BroadcastStream::new(rx);
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
    };
    tracing::trace!("{:?}", res);
    res
}
