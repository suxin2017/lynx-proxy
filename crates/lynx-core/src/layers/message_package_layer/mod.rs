use std::fmt::Debug;
use std::iter::Extend;
use std::{
    pin::Pin,
    sync::Arc,
    task::{Context, Poll},
};

use anyhow::{Result, anyhow};
use axum::body::Body as AxumBody;
use axum::extract::Request;
use axum::response::{IntoResponse, Response};
use bytes::Bytes;
use http::Extensions;
use http_body_util::BodyExt;
use hyper::body::Body;
use lynx_db::dao::net_request_dao::{CaptureSwitchDao, RecordingStatus};
use message_event_data::{
    MessageEventRequest, MessageEventResponse, MessageEventTunnel, MessageEventWebSocket,
    TunnelStatus, WebSocketStatus, copy_body_stream,
};
use message_event_store::{MessageEvent, MessageEventStoreValue, MessageEventTimings};
use tokio::{spawn, sync::broadcast};
use tokio_stream::{StreamExt, wrappers::ReceiverStream};
use tokio_tungstenite::tungstenite;
use tower::Service;
use tracing::{Instrument, instrument, trace, trace_span, warn};

// 添加解压相关导入
use async_compression::tokio::bufread::{BrotliDecoder, GzipDecoder, ZlibDecoder};
use tokio::io::BufReader;
use tokio_util::io::ReaderStream;

use crate::proxy::proxy_ws_request::SendType;
use crate::{
    common::{Req, Res},
    self_service::is_self_service,
};

use super::extend_extension_layer::DbExtensionsExt;
use super::trace_id_layer::service::{TraceId, TraceIdExt};

pub mod message_event_data;
pub mod message_event_store;

// 根据响应头创建解压流
async fn process_compressed_body(
    headers: &http::HeaderMap,
    body_stream: ReceiverStream<Bytes>,
    sender: tokio::sync::broadcast::Sender<MessageEvent>,
    trace_id: TraceId,
) {
    use tokio_util::io::StreamReader;

    let error_stream = body_stream.map(|bytes| Ok::<Bytes, std::io::Error>(bytes));

    if let Some(encoding) = headers.get("content-encoding") {
        match encoding.to_str().unwrap_or("").to_lowercase().as_str() {
            "gzip" => {
                let reader = StreamReader::new(error_stream);
                let buf_reader = BufReader::new(reader);
                let decoder = GzipDecoder::new(buf_reader);
                let mut stream = ReaderStream::new(decoder);

                while let Some(result) = stream.next().await {
                    let trace_id = trace_id.clone();
                    match result {
                        Ok(data) => {
                            trace!("Dispatching OnResponseBody event (gzip)");
                            let _ = sender.send(MessageEvent::OnResponseBody(trace_id, Some(data)));
                        }
                        Err(e) => {
                            trace!("Gzip decompression error: {:?}", e);
                            break;
                        }
                    }
                }
            }
            "deflate" => {
                let reader = StreamReader::new(error_stream);
                let buf_reader = BufReader::new(reader);
                // 使用 ZlibDecoder 而不是 DeflateDecoder，因为 HTTP deflate 通常是 zlib 格式
                let decoder = ZlibDecoder::new(buf_reader);
                let mut stream = ReaderStream::new(decoder);

                while let Some(result) = stream.next().await {
                    let trace_id = trace_id.clone();
                    match result {
                        Ok(data) => {
                            trace!("Dispatching OnResponseBody event (deflate/zlib)");
                            let _ = sender.send(MessageEvent::OnResponseBody(trace_id, Some(data)));
                        }
                        Err(e) => {
                            trace!("Zlib decompression error: {:?}", e);
                            break;
                        }
                    }
                }
            }
            "br" => {
                let reader = StreamReader::new(error_stream);
                let buf_reader = BufReader::new(reader);
                let decoder = BrotliDecoder::new(buf_reader);
                let mut stream = ReaderStream::new(decoder);

                while let Some(result) = stream.next().await {
                    let trace_id = trace_id.clone();
                    match result {
                        Ok(data) => {
                            trace!("Dispatching OnResponseBody event (brotli)");
                            let _ = sender.send(MessageEvent::OnResponseBody(trace_id, Some(data)));
                        }
                        Err(e) => {
                            trace!("Brotli decompression error: {:?}", e);
                            break;
                        }
                    }
                }
            }
            _ => {
                let mut stream = error_stream;
                while let Some(result) = stream.next().await {
                    let trace_id = trace_id.clone();
                    match result {
                        Ok(data) => {
                            trace!("Dispatching OnResponseBody event (raw)");
                            let _ = sender.send(MessageEvent::OnResponseBody(trace_id, Some(data)));
                        }
                        Err(_) => break,
                    }
                }
            }
        }
    } else {
        let mut stream = error_stream;
        while let Some(result) = stream.next().await {
            let trace_id = trace_id.clone();
            match result {
                Ok(data) => {
                    trace!("Dispatching OnResponseBody event (no compression)");
                    let _ = sender.send(MessageEvent::OnResponseBody(trace_id, Some(data)));
                }
                Err(_) => break,
            }
        }
    }

    let _ = sender.send(MessageEvent::OnResponseBody(trace_id, None));
}

pub struct MessageEventChannel {
    broadcast_sender: tokio::sync::broadcast::Sender<MessageEvent>,
}

impl Debug for MessageEventChannel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("MessageEventChannel").finish()
    }
}

/// 处理单个消息事件
pub async fn handle_message_event_single(
    event: MessageEvent,
    cache: Arc<message_event_store::MessageEventCache>,
) -> Result<()> {
    match event {
        MessageEvent::OnRequestStart(id, req) => {
            let mut timings = MessageEventTimings::default();
            timings.set_request_start();

            let mut value = MessageEventStoreValue::new(id.clone());

            value.request = Some(req);
            value.timings = timings;
            value.status = message_event_store::MessageEventStatus::RequestStarted;

            cache.insert(id, value).await;
        }
        MessageEvent::OnRequestBody(id, data) => {
            let value = cache.get_mut(&id);
            if value.is_none() {
                return Ok(());
            }
            let mut value = value.unwrap();

            if let Some(data) = data {
                if let Some(req) = value.request_mut() {
                    req.body.extend(data);
                }
                value.timings_mut().set_request_body_start();
            } else {
                if value
                    .request
                    .as_ref()
                    .filter(|req| req.body.is_empty())
                    .is_some()
                {
                    value.timings_mut().set_request_body_start();
                }
                value.timings_mut().set_request_body_end()
            }
        }
        MessageEvent::OnRequestEnd(id) => {
            let value = cache.get_mut(&id);
            if value.is_none() {
                return Ok(());
            }
            let mut value = value.unwrap();
            value.timings_mut().set_request_end();
            value.status = message_event_store::MessageEventStatus::Completed;
        }
        MessageEvent::OnError(id, error_reason) => {
            let value = cache.get_mut(&id);
            if value.is_none() {
                return Ok(());
            }
            let mut value = value.unwrap();
            value.timings_mut().set_request_end();
            value.status = message_event_store::MessageEventStatus::Error(error_reason);
        }
        MessageEvent::OnResponseBody(id, data) => {
            let value = cache.get_mut(&id);
            if value.is_none() {
                return Ok(());
            }
            let mut value = value.unwrap();
            if let Some(data) = data {
                if let Some(req) = value.response_mut() {
                    req.body.extend(data);
                }
                value.timings_mut().set_response_body_start();
            } else {
                if value
                    .request
                    .as_ref()
                    .filter(|req| req.body.is_empty())
                    .is_some()
                {
                    value.timings_mut().set_response_body_start();
                }
                value.timings_mut().set_response_body_end()
            }
        }
        MessageEvent::OnProxyStart(id) => {
            let value = cache.get_mut(&id);
            if value.is_none() {
                return Ok(());
            }
            let mut value = value.unwrap();
            value.timings_mut().set_proxy_start();
        }
        MessageEvent::OnProxyEnd(id) => {
            let value = cache.get_mut(&id);
            if value.is_none() {
                return Ok(());
            }
            let mut value = value.unwrap();
            value.timings_mut().set_proxy_end();
        }
        MessageEvent::OnResponseStart(id, res) => {
            let value = cache.get_mut(&id);
            if value.is_none() {
                return Ok(());
            }
            let mut value = value.unwrap();
            value.response_mut().replace(res);
        }
        MessageEvent::OnWebSocketStart(id) => {
            let value = cache.get_mut(&id);
            if value.is_none() {
                return Ok(());
            }
            let mut value = value.unwrap();
            value.timings_mut().set_websocket_start();
            value.messages = Some(MessageEventWebSocket {
                ..Default::default()
            });
        }
        MessageEvent::OnWebSocketError(id, error_reason) => {
            let value = cache.get_mut(&id);
            if value.is_none() {
                return Ok(());
            }
            let mut value = value.unwrap();
            value.timings_mut().set_websocket_end();
            let msg = value.messages_mut();

            match msg {
                Some(msg) => {
                    msg.status = WebSocketStatus::Error(error_reason);
                }
                None => {
                    let msg = MessageEventWebSocket {
                        status: WebSocketStatus::Error(error_reason),
                        ..Default::default()
                    };
                    value.messages = Some(msg);
                }
            }
        }
        MessageEvent::OnWebSocketMessage(id, log) => {
            let value = cache.get_mut(&id);
            if value.is_none() {
                return Ok(());
            }
            let mut value = value.unwrap();
            let msg = value.messages_mut();

            match msg {
                Some(msg) => {
                    msg.status = WebSocketStatus::from(&log.message);
                    msg.message.push(log);
                }
                None => {
                    let mut msg = MessageEventWebSocket {
                        status: WebSocketStatus::from(&log.message),
                        ..Default::default()
                    };
                    msg.message.push(log);
                    value.messages = Some(msg);
                }
            }
        }
        MessageEvent::OnTunnelEnd(id) => {
            let value = cache.get_mut(&id);
            if value.is_none() {
                return Ok(());
            }
            let mut value = value.unwrap();

            value.timings_mut().set_tunnel_end();
            let msg = &mut value.tunnel;

            match msg {
                Some(msg) => msg.status = TunnelStatus::Disconnected,
                None => {
                    warn!("Tunnel not found for id: {}", id);
                }
            }
        }
        MessageEvent::OnTunnelStart(id) => {
            let value = cache.get_mut(&id);
            if value.is_none() {
                return Ok(());
            }
            let mut value = value.unwrap();
            value.timings_mut().set_tunnel_start();
            value.tunnel = Some(MessageEventTunnel {
                status: TunnelStatus::Connected,
            });
        }
    }
    Ok(())
}

impl MessageEventChannel {
    pub fn new(cache: Arc<message_event_store::MessageEventCache>) -> Self {
        let (broadcast_tx, _broadcast_rx) = broadcast::channel::<MessageEvent>(1024);

        let cache_clone = cache.clone();
        let mut rx = broadcast_tx.subscribe();
        spawn(async move {
            loop {
                match rx.recv().await {
                    Ok(event) => {
                        if let Err(e) =
                            handle_message_event_single(event, cache_clone.clone()).await
                        {
                            tracing::error!("Error handling message event: {:?}", e);
                        }
                    }
                    Err(broadcast::error::RecvError::Closed) => {
                        tracing::warn!("Broadcast channel closed, stopping message event handler.");
                        break;
                    }
                    Err(broadcast::error::RecvError::Lagged(_)) => {
                        tracing::warn!("Broadcast channel lagged, some messages may be missed.");
                    }
                }
            }
        });

        Self {
            broadcast_sender: broadcast_tx,
        }
    }

    /// 创建一个新的订阅者
    pub fn subscribe(&self) -> tokio::sync::broadcast::Receiver<MessageEvent> {
        self.broadcast_sender.subscribe()
    }

    /// 发送消息到所有订阅者
    fn sync_send_event(&self, event: MessageEvent) {
        // 发送到 broadcast channel
        let _ = self.broadcast_sender.send(event);
    }

    /// 发送消息到所有订阅者
    async fn send_event(&self, event: MessageEvent) {
        // 发送到 broadcast channel
        let _ = self.broadcast_sender.send(event);
    }

    #[instrument(skip_all)]
    pub async fn dispatch_on_request_start<T: Body>(
        &self,
        request: &Request<T>,
        mut body: ReceiverStream<Bytes>,
    ) {
        let sender = self.broadcast_sender.clone();
        let trace_id = request.extensions().get_trace_id().clone();
        spawn(async move {
            let trace_id = trace_id.clone(); // Clone before the loop
            while let Some(data) = body.next().await {
                let trace_id = trace_id.clone(); // Clone for each iteration
                let _ = sender.send(MessageEvent::OnRequestBody(trace_id, Some(data)));
            }
            let _ = sender.send(MessageEvent::OnRequestBody(trace_id, None));
        });

        let _ = self
            .send_event(MessageEvent::OnRequestStart(
                request.extensions().get_trace_id().clone(),
                MessageEventRequest::from(request),
            ))
            .await;
    }

    #[instrument(skip_all)]
    pub async fn dispatch_on_request_end(&self, request_id: TraceId) {
        let _ = self
            .send_event(MessageEvent::OnRequestEnd(request_id))
            .await;
    }

    #[instrument(skip_all)]
    pub async fn dispatch_on_before_proxy(&self, request_id: TraceId) {
        let _ = self
            .send_event(MessageEvent::OnProxyStart(request_id))
            .await;
    }

    #[instrument(skip_all)]
    pub async fn dispatch_on_after_proxy(&self, request_id: TraceId) {
        let _ = self.send_event(MessageEvent::OnProxyEnd(request_id)).await;
    }

    #[instrument(skip_all)]
    pub async fn dispatch_on_tunnel_start(&self, request_id: TraceId) {
        let _ = self
            .send_event(MessageEvent::OnTunnelStart(request_id))
            .await;
    }

    #[instrument(skip_all)]
    pub async fn dispatch_on_tunnel_end(&self, request_id: TraceId) {
        let _ = self.send_event(MessageEvent::OnTunnelEnd(request_id)).await;
    }

    #[instrument(skip_all)]
    pub async fn dispatch_on_error(&self, request_id: TraceId, error_reason: String) {
        let _ = self
            .send_event(MessageEvent::OnError(request_id, error_reason))
            .await;
    }

    #[instrument(skip_all)]
    pub async fn dispatch_on_response_start(&self, res: &Res, body: ReceiverStream<Bytes>) {
        let sender = self.broadcast_sender.clone();
        let trace_id = res.extensions().get_trace_id().clone();
        let span = tracing::Span::current();
        let headers = res.headers().clone();

        spawn(
            async move {
                process_compressed_body(&headers, body, sender, trace_id).await;
            }
            .instrument(span),
        );

        let _ = self
            .send_event(MessageEvent::OnResponseStart(
                res.extensions().get_trace_id().clone(),
                MessageEventResponse::from(res),
            ))
            .await;
    }

    #[instrument(skip_all)]
    pub async fn dispatch_on_websocket_start(&self, request_id: TraceId) {
        let _ = self
            .send_event(MessageEvent::OnWebSocketStart(request_id))
            .await;
    }

    #[instrument(skip_all)]
    pub async fn dispatch_on_websocket_error(&self, request_id: TraceId, error_reason: String) {
        let _ = self
            .send_event(MessageEvent::OnWebSocketError(request_id, error_reason))
            .await;
    }

    #[instrument(skip_all)]
    pub async fn dispatch_on_websocket_message(
        &self,
        request_id: TraceId,
        send_type: SendType,
        message: &tungstenite::Message,
    ) {
        use crate::layers::message_package_layer::message_event_data::{
            WebSocketDirection, WebSocketLog, WebSocketMessage,
        };
        let direction = match send_type {
            SendType::ClientToServer => WebSocketDirection::ClientToServer,
            SendType::ServerToClient => WebSocketDirection::ServerToClient,
        };

        let log = WebSocketLog {
            direction,
            timestamp: chrono::Utc::now().timestamp_millis() as u64,
            message: WebSocketMessage::from(message),
        };
        let _ = self
            .send_event(MessageEvent::OnWebSocketMessage(request_id, log))
            .await;
    }
}

pub trait MessageEventLayerExt {
    fn get_message_event_cannel(&self) -> Arc<MessageEventChannel>;
}

impl MessageEventLayerExt for Extensions {
    fn get_message_event_cannel(&self) -> Arc<MessageEventChannel> {
        self.get::<Arc<MessageEventChannel>>()
            .expect("MessageEventChannel not found in Extensions")
            .clone()
    }
}

#[derive(Clone)]
pub struct RequestMessageEventService<S> {
    pub service: S,
}

impl<S> Service<Req> for RequestMessageEventService<S>
where
    S: Service<Req, Future: Future + Send + 'static> + Clone + Send + 'static,
    S::Future: Send,
    S::Response: Send,
    S::Error: Send,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.service.poll_ready(cx)
    }

    #[instrument(
        skip_all,
        name = "request_message_event_service",
        trace_id = %request.extensions().get_trace_id(),
        uri = %request.uri(),
    )]
    fn call(&mut self, request: Req) -> Self::Future {
        if is_self_service(&request) {
            return Box::pin(self.service.call(request));
        }
        let message_event_channel = request.extensions().get_message_event_cannel();
        let trace_id = request.extensions().get_trace_id();
        let message_event_channel_clone = message_event_channel.clone();
        let trace_id_clone = trace_id.clone();
        let db = request.extensions().get_db();

        let (part, old_body) = request.into_parts();
        let old_body = old_body.map_err(|e| anyhow!(e)).boxed();

        let (copy_stream, old_body) = copy_body_stream(AxumBody::new(old_body));

        let request = Request::from_parts(part, old_body);

        let mut inner = self.service.clone();

        Box::pin(async move {
            let capture_dao = CaptureSwitchDao::new(db.clone());
            let capture_switch = capture_dao.get_capture_switch().await;
            let need_capture = if let Ok(capture_switch) = capture_switch {
                matches!(
                    capture_switch.recording_status,
                    RecordingStatus::PauseRecording
                )
            } else {
                false
            };

            if !need_capture {
                let future = inner.call(request);
                return future.await;
            }
            let mut guard = RequestAbortGuard {
                message_event_channel: message_event_channel.clone(),
                completed: false,
                trace_id: trace_id.clone(),
            };
            message_event_channel_clone
                .dispatch_on_request_start(&request, copy_stream)
                .await;
            let future = inner.call(request);
            let result = future.await;
            message_event_channel_clone
                .dispatch_on_request_end(trace_id_clone)
                .await;
            guard.completed = true;
            result
        })
    }
}

#[derive(Clone)]
pub struct ProxyMessageEventService<S> {
    pub service: S,
}

/// 当请求被取消的时候，需要出发一个取消的错误事件
pub struct RequestAbortGuard {
    message_event_channel: Arc<MessageEventChannel>,
    completed: bool,
    trace_id: TraceId,
}

impl Drop for RequestAbortGuard {
    fn drop(&mut self) {
        if self.completed {
            return;
        }
        self.message_event_channel
            .sync_send_event(MessageEvent::OnError(
                self.trace_id.clone(),
                "Proxy request canceled".to_string(),
            ));
    }
}

impl<S> Service<Req> for ProxyMessageEventService<S>
where
    S: Service<Req, Future: Future + Send + 'static, Response = Response, Error = anyhow::Error>
        + Clone
        + Send
        + Sync
        + 'static,
    S::Future: Send,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.service.poll_ready(cx)
    }

    fn call(&mut self, request: Req) -> Self::Future {
        let span = trace_span!("proxy_message_event_service");
        let message_event_channel = request.extensions().get_message_event_cannel();
        let trace_id = request.extensions().get_trace_id();
        let message_event_channel_clone = message_event_channel.clone();
        let db = request.extensions().get_db();

        let mut inner = self.service.clone();

        Box::pin(
            async move {
                let mut guard = RequestAbortGuard {
                    message_event_channel: message_event_channel.clone(),
                    completed: false,
                    trace_id: trace_id.clone(),
                };
                let capture_dao = CaptureSwitchDao::new(db.clone());
                let capture_switch = capture_dao.get_capture_switch().await;
                let need_capture = if let Ok(capture_switch) = capture_switch {
                    matches!(
                        capture_switch.recording_status,
                        RecordingStatus::PauseRecording
                    )
                } else {
                    false
                };

                if !need_capture {
                    let future = inner.call(request);
                    return future.await;
                }

                message_event_channel_clone
                    .dispatch_on_before_proxy(trace_id.clone())
                    .await;
                let future = inner.call(request);
                let result = future.await;
                message_event_channel_clone
                    .dispatch_on_after_proxy(trace_id.clone())
                    .await;
                guard.completed = true;
                match result {
                    Ok(res) => {
                        let (part, old_body) = res.into_parts();
                        let (copy_stream, old_body) = copy_body_stream(old_body);
                        let res = Res::from_parts(part, old_body);
                        message_event_channel_clone
                            .dispatch_on_response_start(&res, copy_stream)
                            .await;
                        Ok(res.into_response())
                    }
                    Err(e) => {
                        message_event_channel_clone
                            .dispatch_on_error(trace_id, format!("{:?}", e))
                            .await;
                        Err(e)
                    }
                }
            }
            .instrument(span),
        )
    }
}
