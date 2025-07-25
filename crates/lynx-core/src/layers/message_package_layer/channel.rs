use std::fmt::Debug;
use std::sync::Arc;
use bytes::Bytes;
use axum::extract::Request;
use hyper::body::Body;
use tokio::{spawn, sync::broadcast};
use tokio_stream::{StreamExt, wrappers::ReceiverStream};
use tokio_tungstenite::tungstenite;
use tracing::{Instrument, instrument};

use crate::proxy::proxy_ws_request::SendType;
use crate::common::Res;

use super::compression::process_compressed_body;
use super::event_handler::handle_message_event_single;
use super::message_event_data::{
    MessageEventRequest, MessageEventResponse, WebSocketDirection, WebSocketLog, WebSocketMessage,
};
use super::message_event_store::MessageEvent;
use super::super::extend_extension_layer::DbExtensionsExt;
use super::super::trace_id_layer::service::{TraceId, TraceIdExt};

pub struct MessageEventChannel {
    broadcast_sender: tokio::sync::broadcast::Sender<MessageEvent>,
}

impl Debug for MessageEventChannel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("MessageEventChannel").finish()
    }
}

impl MessageEventChannel {
    pub fn new() -> Self {
        let (broadcast_tx, _broadcast_rx) = broadcast::channel::<MessageEvent>(1024);

        Self {
            broadcast_sender: broadcast_tx,
        }
    }

    pub fn setup_short_pool(self: &Self,cache: Arc<super::message_event_store::MessageEventCache>){
        let cache_clone = cache.clone();
        let mut rx = self.subscribe();
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
    }

    /// 创建一个新的订阅者
    pub fn subscribe(&self) -> tokio::sync::broadcast::Receiver<MessageEvent> {
        self.broadcast_sender.subscribe()
    }

    /// 发送消息到所有订阅者
    pub fn sync_send_event(&self, event: MessageEvent) {
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