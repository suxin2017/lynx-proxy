use std::iter::Extend;
use std::{
    pin::Pin,
    sync::Arc,
    task::{Context, Poll},
};

use anyhow::{Result, anyhow};
use axum::extract::Request;
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
use tokio::{spawn, sync::mpsc::channel};
use tokio_stream::{StreamExt, wrappers::ReceiverStream};
use tokio_tungstenite::tungstenite;
use tower::Service;
use tracing::{info, trace, warn};

use crate::proxy::proxy_ws_request::SendType;
use crate::{
    common::{Req, Res},
    self_service::is_self_service,
};

use super::extend_extension_layer::DbExtensionsExt;
use super::trace_id_layer::service::{TraceId, TraceIdExt};

pub mod message_event_data;
pub mod message_event_store;

pub struct MessageEventCannel {
    sender: tokio::sync::mpsc::Sender<MessageEvent>,
}

pub async fn handle_message_event(
    mut rx: tokio::sync::mpsc::Receiver<MessageEvent>,
    cache: Arc<message_event_store::MessageEventCache>,
) -> Result<()> {
    info!("MessageEventCannel started");
    while let Some(event) = rx.recv().await {
        match event {
            MessageEvent::OnRequestStart(id, req) => {
                tracing::trace!("Received OnRequestStart event");

                let mut timings = MessageEventTimings::default();
                timings.set_request_start();

                let mut value = MessageEventStoreValue::new(id.clone());

                value.request = Some(req);
                value.timings = timings;
                value.status = message_event_store::MessageEventStatus::RequestStarted;

                cache.insert(id, value).await;
            }
            MessageEvent::OnRequestBody(id, data) => {
                tracing::trace!(
                    "Received OnRequestBody event: {:?} {:?}",
                    id,
                    data.as_ref().map(|d| d.len())
                );
                let value = cache.get_mut(&id);
                if value.is_none() {
                    continue;
                }
                let mut value = value.unwrap();

                if let Some(data) = data {
                    if let Some(req) = value.request_mut() {
                        req.body.extend(data);
                    }
                    value.timings_mut().set_request_body_start();
                } else {
                    value.timings_mut().set_request_body_end()
                }
            }
            MessageEvent::OnRequestEnd(id) => {
                tracing::trace!("Received OnRequestEnd event");
                let value = cache.get_mut(&id);
                if value.is_none() {
                    continue;
                }
                let mut value = value.unwrap();
                value.timings_mut().set_request_end();
                value.status = message_event_store::MessageEventStatus::Completed;
            }
            MessageEvent::OnError(id, error_reason) => {
                tracing::trace!("Received OnRequestEnd event");
                let value = cache.get_mut(&id);
                if value.is_none() {
                    continue;
                }
                let mut value = value.unwrap();
                value.timings_mut().set_request_end();
                value.status = message_event_store::MessageEventStatus::Error(error_reason);
            }
            MessageEvent::OnResponseBody(id, data) => {
                let value = cache.get_mut(&id);
                if value.is_none() {
                    continue;
                }
                let mut value = value.unwrap();
                if let Some(data) = data {
                    if let Some(req) = value.response_mut() {
                        req.body.extend(data);
                    }
                    value.timings_mut().set_response_body_start();
                } else {
                    value.timings_mut().set_response_body_end()
                }
            }
            MessageEvent::OnProxyStart(id) => {
                tracing::trace!("Received OnProxyStart event");
                let value = cache.get_mut(&id);
                if value.is_none() {
                    continue;
                }
                let mut value = value.unwrap();
                value.timings_mut().set_proxy_start();
            }
            MessageEvent::OnProxyEnd(id) => {
                tracing::trace!("Received OnProxyStart event");
                let value = cache.get_mut(&id);
                if value.is_none() {
                    continue;
                }
                let mut value = value.unwrap();
                value.timings_mut().set_proxy_end();
            }
            MessageEvent::OnResponseStart(id, res) => {
                tracing::trace!("Received OnResponseStart event");
                let value = cache.get_mut(&id);
                if value.is_none() {
                    continue;
                }
                let mut value = value.unwrap();
                value.response_mut().replace(res);
            }
            MessageEvent::OnWebSocketStart(id) => {
                tracing::trace!("Received OnWebSocketStart event {}", id);
                let value = cache.get_mut(&id);
                if value.is_none() {
                    continue;
                }
                let mut value = value.unwrap();
                value.timings_mut().set_websocket_start();
                value.messages = Some(MessageEventWebSocket {
                    ..Default::default()
                });
            }
            MessageEvent::OnWebSocketError(id, error_reason) => {
                tracing::trace!("Received OnWebSocketError event {}", id);
                let value = cache.get_mut(&id);
                if value.is_none() {
                    continue;
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
                tracing::trace!("Received OnWebSocketMessage event {}", id);
                let value = cache.get_mut(&id);
                if value.is_none() {
                    continue;
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
                tracing::trace!("Received OnTunnelEnd event {}", id);
                let value = cache.get_mut(&id);
                if value.is_none() {
                    continue;
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
                tracing::trace!("Received OnTunnelStart event {}", id);
                let value = cache.get_mut(&id);
                if value.is_none() {
                    continue;
                }
                let mut value = value.unwrap();
                value.timings_mut().set_tunnel_start();
                value.tunnel = Some(MessageEventTunnel {
                    status: TunnelStatus::Connected,
                });
            }
        }
    }
    Ok(())
}

impl MessageEventCannel {
    pub fn new(cache: Arc<message_event_store::MessageEventCache>) -> Self {
        let (tx, rx) = channel::<MessageEvent>(100);

        spawn(async move {
            handle_message_event(rx, cache).await.unwrap_or_else(|e| {
                tracing::error!("Error handling message event: {:?}", e);
            });
        });
        Self { sender: tx }
    }

    pub async fn dispatch_on_request_start<T: Body>(
        &self,
        request: &Request<T>,
        mut body: ReceiverStream<Bytes>,
    ) {
        trace!("Dispatching OnRequestStart event");
        let sender = self.sender.clone();
        let trace_id = request.extensions().get_trace_id().clone();
        spawn(async move {
            let trace_id = trace_id.clone(); // Clone before the loop
            while let Some(data) = body.next().await {
                let trace_id = trace_id.clone(); // Clone for each iteration
                let _ = sender
                    .send(MessageEvent::OnRequestBody(trace_id, Some(data)))
                    .await;
            }
            let _ = sender
                .send(MessageEvent::OnRequestBody(trace_id, None))
                .await;
        });

        let _ = self
            .sender
            .send(MessageEvent::OnRequestStart(
                request.extensions().get_trace_id().clone(),
                MessageEventRequest::from(request),
            ))
            .await;
    }

    pub async fn dispatch_on_request_end(&self, request_id: TraceId) {
        let _ = self
            .sender
            .send(MessageEvent::OnRequestEnd(request_id))
            .await;
    }

    pub async fn dispatch_on_before_proxy(&self, request_id: TraceId) {
        let _ = self
            .sender
            .send(MessageEvent::OnProxyStart(request_id))
            .await;
    }

    pub async fn dispatch_on_after_proxy(&self, request_id: TraceId) {
        let _ = self.sender.send(MessageEvent::OnProxyEnd(request_id)).await;
    }

    pub async fn dispatch_on_tunnel_start(&self, request_id: TraceId) {
        let _ = self
            .sender
            .send(MessageEvent::OnTunnelStart(request_id))
            .await;
    }

    pub async fn dispatch_on_tunnel_end(&self, request_id: TraceId) {
        let _ = self
            .sender
            .send(MessageEvent::OnTunnelEnd(request_id))
            .await;
    }

    pub async fn dispatch_on_error(&self, request_id: TraceId, error_reason: String) {
        let _ = self
            .sender
            .send(MessageEvent::OnError(request_id, error_reason))
            .await;
    }

    pub async fn dispatch_on_response_start(&self, res: &Res, mut body: ReceiverStream<Bytes>) {
        trace!("Dispatching OnRequestStart event");
        let sender = self.sender.clone();
        let trace_id = res.extensions().get_trace_id().clone();
        spawn(async move {
            let trace_id = trace_id.clone(); // Clone before the loop
            while let Some(data) = body.next().await {
                let trace_id = trace_id.clone(); // Clone for each iteration
                let _ = sender
                    .send(MessageEvent::OnResponseBody(trace_id, Some(data)))
                    .await;
            }
            let _ = sender
                .send(MessageEvent::OnResponseBody(trace_id, None))
                .await;
        });

        let _ = self
            .sender
            .send(MessageEvent::OnResponseStart(
                res.extensions().get_trace_id().clone(),
                MessageEventResponse::from(res),
            ))
            .await;
    }

    pub async fn dispatch_on_websocket_start(&self, request_id: TraceId) {
        let _ = self
            .sender
            .send(MessageEvent::OnWebSocketStart(request_id))
            .await;
    }

    pub async fn dispatch_on_websocket_error(&self, request_id: TraceId, error_reason: String) {
        let _ = self
            .sender
            .send(MessageEvent::OnWebSocketError(request_id, error_reason))
            .await;
    }
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
            .sender
            .send(MessageEvent::OnWebSocketMessage(request_id, log))
            .await;
    }
}

pub trait MessageEventLayerExt {
    fn get_message_event_cannel(&self) -> Arc<MessageEventCannel>;
}

impl MessageEventLayerExt for Extensions {
    fn get_message_event_cannel(&self) -> Arc<MessageEventCannel> {
        self.get::<Arc<MessageEventCannel>>()
            .expect("MessageEventCannel not found in Extensions")
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

        let (copy_stream, old_body) = copy_body_stream(old_body);

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

            if need_capture {
                message_event_channel_clone
                    .dispatch_on_request_start(&request, copy_stream)
                    .await;
            }

            let future = inner.call(request);
            let result = future.await;

            message_event_channel_clone
                .dispatch_on_request_end(trace_id_clone)
                .await;

            result
        })
    }
}

#[derive(Clone)]
pub struct ProxyMessageEventService<S> {
    pub service: S,
}

impl<S> Service<Req> for ProxyMessageEventService<S>
where
    S: Service<Req, Future: Future + Send + 'static, Response = Res, Error = anyhow::Error>
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
        let message_event_channel = request.extensions().get_message_event_cannel();
        let trace_id = request.extensions().get_trace_id();
        let message_event_channel_clone = message_event_channel.clone();

        let mut inner = self.service.clone();

        Box::pin(async move {
            message_event_channel_clone
                .dispatch_on_after_proxy(trace_id.clone())
                .await;

            let future = inner.call(request);
            let result = future.await;

            message_event_channel_clone
                .dispatch_on_before_proxy(trace_id.clone())
                .await;
            match result {
                Ok(res) => {
                    let (part, old_body) = res.into_parts();
                    let (copy_stream, old_body) = copy_body_stream(old_body);
                    let res = Res::from_parts(part, old_body);
                    message_event_channel_clone
                        .dispatch_on_response_start(&res, copy_stream)
                        .await;
                    Ok(res)
                }
                Err(e) => {
                    message_event_channel_clone
                        .dispatch_on_error(trace_id, format!("{:?}", e))
                        .await;
                    Err(e)
                }
            }
        })
    }
}
