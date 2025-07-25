use std::{
    future::Future,
    pin::Pin,
    sync::Arc,
    task::{Context, Poll},
};

use anyhow::{Result, anyhow};
use axum::body::Body as AxumBody;
use axum::extract::Request;
use axum::response::{IntoResponse, Response};
use http::Extensions;
use http_body_util::BodyExt;
use lynx_db::dao::net_request_dao::{CaptureSwitchDao, RecordingStatus};
use tower::Service;
use tracing::{Instrument, instrument, trace_span};

use crate::{
    common::{Req, Res},
    self_service::is_self_service,
};

use super::channel::MessageEventChannel;
use super::message_event_data::copy_body_stream;
use super::message_event_store::MessageEvent;
use super::super::extend_extension_layer::DbExtensionsExt;
use super::super::trace_id_layer::service::{TraceId, TraceIdExt};

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