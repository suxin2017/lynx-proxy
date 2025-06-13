use std::{
    pin::Pin,
    task::{Context, Poll},
};

use axum::response::Response;
use tower::Service;
use tracing::{Instrument, info, info_span, span, trace_span};

use crate::{
    common::Req,
    layers::{log_layer::LogFuture, trace_id_layer::service::TraceIdExt},
};

#[derive(Debug, Clone)]
pub struct LogService<S> {
    pub service: S,
}

impl<S> Service<Req> for LogService<S>
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
        // Insert log statement here or other functionality
        let span = trace_span!("log service", trace_id = ?request.extensions().get_trace_id(),url = %request.uri());
        let mut inner = self.service.clone();
        let _enter = span.enter();

        Box::pin(
            async move {
                info!("Processing request: {}", request.uri());
                let future = inner.call(request);

                let response = future.await?;
                Ok(response)
            }
            .instrument(span.clone()),
        )
    }
}
