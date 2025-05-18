use std::task::{Context, Poll};

use axum::response::Response;
use tower::Service;
use tracing::{info, info_span};

use crate::{common::Req, layers::log_layer::LogFuture};

#[derive(Debug, Clone)]
pub struct LogService<S> {
    pub service: S,
}

impl<S> Service<Req> for LogService<S>
where
    S: Service<Req, Response = Response, Error = anyhow::Error>,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = LogFuture<S::Future>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.service.poll_ready(cx)
    }

    fn call(&mut self, request: Req) -> Self::Future {
        // Insert log statement here or other functionality
        let span = info_span!("log_service");
        let future = {
            let _guard = span.enter();
            info!("handling request");
            self.service.call(request)
        };
        LogFuture { f: future, span }
    }
}
