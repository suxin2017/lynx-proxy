use std::fs;
use std::io::Read;
use std::path::PathBuf;
use std::sync::Arc;

use base64::Engine;
use base64::prelude::BASE64_STANDARD;
use derive_builder::Builder;
use futures_util::{Sink, SinkExt, Stream, StreamExt, stream};
use http::Uri;
use http::header::CONTENT_TYPE;
use http::uri::Scheme;
use http_body_util::BodyExt;
use http_body_util::combinators::BoxBody;
use hyper::body::{Bytes, Incoming};
use hyper::{Request, Response};
use reqwest::Certificate;
use reqwest_websocket::{Message as ReqwestMessage, RequestBuilderExt};
use sea_orm::{ActiveModelTrait, Set};
use serde::{Deserialize, Serialize};
use tokio::io::AsyncWriteExt;
use tokio::spawn;
use tokio_tungstenite::tungstenite::{self, Message, Utf8Bytes};
use tracing::{error, info, trace};
use ts_rs::TS;

use crate::entities::app_config::get_app_config;
use crate::entities::{request, response};
use crate::proxy_log::body_write_to_file::ws_body_file;
use crate::proxy_log::message::{self, MessageLog};
use crate::proxy_log::try_send_message;
use crate::schedular::get_req_trace_id;
use crate::server_context::get_db_connect;

use anyhow::{Error, Result, anyhow};
use http::header::{CONNECTION, CONTENT_LENGTH, HOST, PROXY_AUTHORIZATION};
use http_body_util::StreamBody;
use hyper_rustls::HttpsConnectorBuilder;
use hyper_util::client::legacy::Client;
use hyper_util::client::legacy::connect::HttpConnector;
use hyper_util::rt::TokioExecutor;
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;

use crate::proxy_log::body_write_to_file::{req_body_file, res_body_file};

use super::http_proxy::get_header_and_size;

fn get_test_root_ca() -> Certificate {
    let mut ca_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    ca_path.push("tests/fixtures/RootCA.crt");
    let mut buf = Vec::new();
    fs::File::open(ca_path)
        .unwrap()
        .read_to_end(&mut buf)
        .unwrap();
    reqwest::Certificate::from_pem(&buf).unwrap()
}

fn request_message_to_message(message: ReqwestMessage) -> tungstenite::Message {
    match message {
        ReqwestMessage::Text(text) => tungstenite::Message::Text(Utf8Bytes::from(text)),
        ReqwestMessage::Binary(data) => tungstenite::Message::Binary(Bytes::from(data)),
        ReqwestMessage::Ping(data) => tungstenite::Message::Ping(Bytes::from(data)),
        ReqwestMessage::Pong(data) => tungstenite::Message::Pong(Bytes::from(data)),
        ReqwestMessage::Close { code, reason } => {
            tungstenite::Message::Close(Some(tungstenite::protocol::CloseFrame {
                code: u16::from(code).into(),
                reason: Utf8Bytes::from(reason),
            }))
        }
    }
}

fn message_to_request_message(message: tungstenite::Message) -> ReqwestMessage {
    match message {
        tungstenite::Message::Frame(_) => {
            unreachable!()
        }
        tungstenite::Message::Text(text) => ReqwestMessage::Text(text.to_string()),
        tungstenite::Message::Binary(data) => ReqwestMessage::Binary(data.to_vec()),
        tungstenite::Message::Ping(data) => ReqwestMessage::Ping(data.to_vec()),
        tungstenite::Message::Pong(data) => ReqwestMessage::Pong(data.to_vec()),
        tungstenite::Message::Close(Some(tungstenite::protocol::CloseFrame { code, reason })) => {
            ReqwestMessage::Close {
                code: u16::from(code).into(),
                reason: reason.to_string(),
            }
        }
        tungstenite::Message::Close(None) => ReqwestMessage::Close {
            code: reqwest_websocket::CloseCode::default(),
            reason: "".to_owned(),
        },
    }
}

pub async fn websocket_proxy(
    req: Request<Incoming>,
) -> anyhow::Result<Response<BoxBody<Bytes, Error>>> {
    let trace_id = get_req_trace_id(&req);
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

    let (header, header_size) = get_header_and_size(res.headers());

    let mut request_active_model = request::ActiveModel {
        trace_id: Set(trace_id.to_string()),
        uri: Set(parts.uri.to_string()),
        method: Set(parts.method.to_string()),
        schema: Set(parts.uri.scheme_str().unwrap_or("").to_string()),
        version: Set(format!("{:?}", parts.version)),
        status_code: Set(Some(200)),
        header: Set(Some(header)),
        header_size: Set(Some(header_size as u32)),
        ..Default::default()
    };
    spawn(async move {
        match client_to_server_socket.await {
            Ok(client_to_server_socket) => {
                let proxy_req = Request::from_parts(parts, ());
                let app_config = get_app_config().await;

                let mut client = reqwest::Client::builder();
                client = client.use_rustls_tls();
                client = client.add_root_certificate(get_test_root_ca());
                let client_request = client.build();
                info!("client_request: {:?}", proxy_req.uri().to_string());
                if let Ok(client_request) = client_request {
                    match client_request
                        .get(proxy_req.uri().to_string())
                        .upgrade()
                        .send()
                        .await
                    {
                        Ok(proxy_res) => {
                            request_active_model.status_code =
                                Set(Some(proxy_res.status().as_u16()));
                            request_active_model.response_mime_type = Set(proxy_res
                                .headers()
                                .get(CONTENT_TYPE)
                                .map(|v| v.to_str().unwrap_or("").to_string()));
                            if app_config.is_recording() {
                                let record =
                                    request_active_model.insert(get_db_connect()).await.unwrap();
                                let request_id = record.id;
                                try_send_message(MessageLog::request_log(record));
                                let header_size: usize = proxy_res
                                    .headers()
                                    .iter()
                                    .map(|(k, v)| k.as_str().len() + v.as_bytes().len())
                                    .sum();

                                let response = response::ActiveModel {
                                    request_id: Set(request_id),
                                    trace_id: Set(trace_id.to_string()),
                                    header: Set(proxy_res
                                        .headers()
                                        .iter()
                                        .map(|(k, v)| {
                                            (
                                                k.as_str().to_string(),
                                                v.to_str().unwrap_or("").to_string(),
                                            )
                                        })
                                        .collect()),
                                    header_size: Set(header_size as u32),
                                    ..Default::default()
                                };

                                response.insert(get_db_connect()).await.unwrap();
                            }

                            let server_to_client_websocket = proxy_res.into_websocket().await;

                            match server_to_client_websocket {
                                Ok(websocket) => {
                                    let (mut client_sink, mut client_stream) =
                                        client_to_server_socket.split();
                                    let (mut server_sink, mut server_stream) = websocket.split();
                                    // send message to client from server
                                    let a_trace_id = trace_id.clone();
                                    // send message to server from client
                                    spawn(async move {
                                        let mut file = ws_body_file(&a_trace_id.clone()).await;

                                        while let Some(message) = client_stream.next().await {
                                            let message = message.unwrap();
                                            if let Ok(ref mut file) = file {
                                                let log = WebSocketLog::from_message(
                                                    a_trace_id.clone(),
                                                    &SendType::ClientToServer,
                                                    &message,
                                                )
                                                .unwrap();
                                                let json = serde_json::to_string(&log)
                                                    .map_err(|e| anyhow!(e))
                                                    .unwrap();
                                                try_send_message(MessageLog::websocket_log(log));
                                                file.write_all(json.as_bytes()).await.unwrap();
                                                file.write_all(b"\n").await.unwrap();
                                            } else {
                                                trace!("no receiver, skip write websocket body");
                                            }
                                            let msg = message_to_request_message(message);
                                            server_sink.send(msg).await.unwrap();
                                        }
                                        if let Ok(mut file) = file {
                                            file.flush().await.unwrap();
                                        }
                                        trace!("WebSocket connection closed");
                                    });
                                    // send message to client from server
                                    let b_trace_id = trace_id.clone();
                                    spawn(async move {
                                        let mut file = ws_body_file(&b_trace_id).await;

                                        while let Some(message) = server_stream.next().await {
                                            let message: ReqwestMessage = message.unwrap();
                                            let m: Message = request_message_to_message(message);

                                            if let Ok(ref mut file) = file {
                                                let log = WebSocketLog::from_message(
                                                    b_trace_id.clone(),
                                                    &SendType::ServerToClient,
                                                    &m,
                                                )
                                                .unwrap();
                                                let json = serde_json::to_string(&log)
                                                    .map_err(|e| anyhow!(e))
                                                    .unwrap();
                                                try_send_message(MessageLog::websocket_log(log));
                                                file.write_all(json.as_bytes()).await.unwrap();
                                                file.write_all(b"\n").await.unwrap();
                                            } else {
                                                trace!("no receiver, skip write websocket body");
                                            }
                                            client_sink.send(m).await.unwrap();
                                        }
                                        if let Ok(mut file) = file {
                                            file.flush().await.unwrap();
                                        }
                                        trace!("WebSocket connection closed");
                                    });
                                }
                                Err(e) => {
                                    error!("create websocket connect error {:?}", e);
                                }
                            }
                        }
                        Err(e) => {
                            error!("create websocket connect error {:?}", e);
                        }
                    }
                }

                // match tokio_tungstenite::connect_async(proxy_req).await {
                //     Ok((server_to_client_socket, proxy_res)) => {
                //         request_active_model.status_code = Set(Some(proxy_res.status().as_u16()));
                //         request_active_model.response_mime_type = Set(proxy_res
                //             .headers()
                //             .get(CONTENT_TYPE)
                //             .map(|v| v.to_str().unwrap_or("").to_string()));
                //         if app_config.is_recording() {
                //             let record =
                //                 request_active_model.insert(get_db_connect()).await.unwrap();
                //             let request_id = record.id;
                //             try_send_message(MessageLog::request_log(record));
                //             let header_size: usize = proxy_res
                //                 .headers()
                //                 .iter()
                //                 .map(|(k, v)| k.as_str().len() + v.as_bytes().len())
                //                 .sum();

                //             let response = response::ActiveModel {
                //                 request_id: Set(request_id),
                //                 trace_id: Set(trace_id.to_string()),
                //                 header: Set(proxy_res
                //                     .headers()
                //                     .iter()
                //                     .map(|(k, v)| {
                //                         (
                //                             k.as_str().to_string(),
                //                             v.to_str().unwrap_or("").to_string(),
                //                         )
                //                     })
                //                     .collect()),
                //                 header_size: Set(header_size as u32),
                //                 ..Default::default()
                //             };

                //             response.insert(get_db_connect()).await.unwrap();
                //         }
                //         let (client_sink, client_stream) = client_to_server_socket.split();
                //         let (server_sink, server_stream) = server_to_client_socket.split();
                //         // send message to server from client
                //         spawn(serve_websocket(
                //             server_sink,
                //             client_stream,
                //             SendType::ClientToServer,
                //             trace_id.clone(),
                //         ));
                //         // send message to client from server
                //         spawn(serve_websocket(
                //             client_sink,
                //             server_stream,
                //             SendType::ServerToClient,
                //             trace_id.clone(),
                //         ));
                //     }
                //     Err(e) => {
                //         error!("create websocket connect error {:?}", e);
                //     }
                // }
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

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub enum SendType {
    ClientToServer,
    ServerToClient,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, Builder)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct WebSocketLog {
    pub trace_id: String,
    pub send_type: SendType,
    pub data: String,
}

impl WebSocketLog {
    pub fn from_message(
        trace_id: Arc<String>,
        send_type: &SendType,
        message: &Message,
    ) -> Result<Self> {
        let data = match message {
            Message::Text(text) => BASE64_STANDARD.encode(text.as_bytes()),
            Message::Binary(data) => BASE64_STANDARD.encode(data),
            Message::Ping(data) => BASE64_STANDARD.encode(data),
            Message::Pong(data) => BASE64_STANDARD.encode(data),
            Message::Close(_) => BASE64_STANDARD.encode("close"),
            Message::Frame(_) => BASE64_STANDARD.encode("frame"),
        };
        WebSocketLogBuilder::create_empty()
            .data(data)
            .send_type(send_type.clone())
            .trace_id(trace_id.to_string())
            .build()
            .map_err(|e| anyhow!(e))
    }
}

/// Handle a websocket connection.
async fn serve_websocket(
    mut sink: impl Sink<tungstenite::Message, Error = tungstenite::Error> + Unpin + Send,
    mut stream: impl Stream<Item = Result<tungstenite::Message, tungstenite::Error>> + Unpin + Send,
    send_type: SendType,
    trace_id: Arc<String>,
) -> Result<()> {
    let mut file = ws_body_file(&trace_id).await;

    while let Some(message) = stream.next().await {
        let message = message?;
        if let Ok(ref mut file) = file {
            let log = WebSocketLog::from_message(trace_id.clone(), &send_type, &message)?;
            let json = serde_json::to_string(&log).map_err(|e| anyhow!(e))?;
            try_send_message(MessageLog::websocket_log(log));
            file.write_all(json.as_bytes()).await?;
            file.write_all(b"\n").await?;
        } else {
            trace!("no receiver, skip write websocket body");
        }
        sink.send(message).await?;
    }
    if let Ok(mut file) = file {
        file.flush().await?;
    }
    trace!("WebSocket connection closed");
    Ok(())
}
