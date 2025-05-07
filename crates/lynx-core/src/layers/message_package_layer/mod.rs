use std::{
    pin::Pin,
    sync::Arc,
    task::{Context, Poll},
};

use axum::extract::Request;
use http::Extensions;
use hyper::body::Body;
use message_event_store::MessageEvent;
use tokio::{spawn, sync::mpsc::channel};
use tower::{Layer, Service, layer::layer_fn};
use tracing::info;

use super::trace_id_layer::service::{TraceId, TraceIdExt};

pub mod message_event_data;
pub mod message_event_store;

pub struct MessageEventCannel {
    sender: tokio::sync::mpsc::Sender<MessageEvent>,
}

impl MessageEventCannel {
    pub fn new() -> Self {
        let (tx, mut rx) = channel::<MessageEvent>(100);

        spawn(async move {
            info!("MessageEventCannel started");
            while let Some(event) = rx.recv().await {
                info!("Received event: {:?}", event);
                // Handle the event here
                println!("Received event: {:?}", event);
            }
        });
        Self { sender: tx }
    }

    pub async fn dispatch_on_request_start<T: Body>(&self, _request: &Request<T>) {
        info!("Dispatching OnRequestStart event");
        let _ = self.sender.send(MessageEvent::OnRequestStart).await;
    }

    pub async fn dispatch_on_request_end(&self, _request_id: TraceId) {
        let _ = self.sender.send(MessageEvent::OnRequestEnd).await;
    }

    pub fn dispatch_on_error(&self, _request_id: TraceId) {
        let _ = self.sender.send(MessageEvent::OnError);
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
    pub inner: S,
}

impl<S, B> Service<Request<B>> for RequestMessageEventService<S>
where
    S: Service<Request<B>, Future: Future + Send + 'static> + Clone + Send + 'static,
    S::Future: Send,
    S::Response: Send,
    S::Error: Send,
    B: Body + Send + Sync + 'static,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, request: Request<B>) -> Self::Future {
        let message_event_channel = request.extensions().get_message_event_cannel();
        let trace_id = request.extensions().get_trace_id();
        let message_event_channel_clone = message_event_channel.clone();
        let trace_id_clone = trace_id.clone();

        let mut inner = self.inner.clone(); // Ensure `self.inner` is `Send`

        Box::pin(async move {
            message_event_channel_clone
                .dispatch_on_request_start(&request)
                .await;

            // 调用内部 service
            let future = inner.call(request); // Use the cloned `inner`
            let result = future.await;

            // 发送请求结束事件
            message_event_channel_clone
                .dispatch_on_request_end(trace_id_clone)
                .await;

            result
        })
    }
}
