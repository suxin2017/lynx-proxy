use std::{
    future::Future,
    pin::Pin,
    task::{Context, Poll},
};

use anyhow::Result;
use axum::response::Response;
use pin_project_lite::pin_project;

pin_project! {
    pub struct RequestProcessingFuture<F> {
        #[pin]
        pub f: F,
    }
}

impl<F> Future for RequestProcessingFuture<F>
where
    F: Future<Output = Result<Response>>,
{
    type Output = F::Output;

    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
        let this = self.project();
        this.f.poll(cx)
    }
}
