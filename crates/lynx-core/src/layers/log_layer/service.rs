use std::task::{Context, Poll};

use tower::Service;
use tracing::{info, info_span};

use crate::{
    common::{HyperReq, Res},
    layers::log_layer::LogFuture,
};

#[derive(Debug, Clone)]
pub struct LogService<S> {
    pub service: S,
}

impl<S> Service<HyperReq> for LogService<S>
where
    S: Service<HyperReq, Response = Res, Error = anyhow::Error>,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = LogFuture<S::Future>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.service.poll_ready(cx)
    }

    fn call(&mut self, request: HyperReq) -> Self::Future {
        // Insert log statement here or other functionality
        let span = info_span!("log_service", method = %request.method(), url = %request.uri(), version = ?request.version());
        let future = {
            let _guard = span.enter();
            info!("handling request");
            self.service.call(request)
        };
        LogFuture { f: future, span }
    }
}
