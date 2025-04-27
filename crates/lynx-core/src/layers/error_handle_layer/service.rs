use std::task::{Context, Poll};

use tower::Service;

use crate::common::{HyperReq, Res};

use super::ErrorHandleFuture;

#[derive(Debug, Clone)]
pub struct ErrorHandlerService<S> {
    pub service: S,
}

impl<S> Service<HyperReq> for ErrorHandlerService<S>
where
    S: Service<HyperReq, Response = Res, Error = anyhow::Error>,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = ErrorHandleFuture<S::Future>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.service.poll_ready(cx)
    }

    fn call(&mut self, request: HyperReq) -> Self::Future {
        ErrorHandleFuture {
            f: self.service.call(request),
        }
    }
}
