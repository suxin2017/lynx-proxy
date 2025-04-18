use core::fmt;
use std::task::{Context, Poll, ready};

use pin_project_lite::pin_project;
use tower::{Layer, Service};

use crate::common::HyperReq;


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
        println!("request = {:?}", request);
        self.service.call(request)
    }
}
