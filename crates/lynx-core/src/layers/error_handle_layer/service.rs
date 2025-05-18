use std::task::{Context, Poll};

use axum::response::Response;
use tower::Service;

use crate::common::Req;

use super::ErrorHandleFuture;

#[derive(Debug, Clone)]
pub struct ErrorHandlerService<S> {
    pub service: S,
}

impl<S> Service<Req> for ErrorHandlerService<S>
where
    S: Service<Req, Response = Response, Error = anyhow::Error>,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = ErrorHandleFuture<S::Future>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.service.poll_ready(cx)
    }

    fn call(&mut self, request: Req) -> Self::Future {
        ErrorHandleFuture {
            f: self.service.call(request),
        }
    }
}
