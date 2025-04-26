use core::fmt;
use std::task::{Context, Poll};

use tower::Service;
use tracing::info;

#[derive(Debug, Clone)]
pub struct LogService<S> {
    pub service: S,
}

impl<S, Request, Res> Service<Request> for LogService<S>
where
    S: Service<Request, Response = Res>,
    Request: fmt::Debug,
    Res: fmt::Debug,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = S::Future;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.service.poll_ready(cx)
    }

    fn call(&mut self, request: Request) -> Self::Future {
        // Insert log statement here or other functionality
        info!("request = {:?}", request);
        self.service.call(request)
    }
}
