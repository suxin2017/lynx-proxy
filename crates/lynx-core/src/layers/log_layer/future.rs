use std::task::{Context, Poll, ready};

use anyhow::Result;
use axum::response::Response;
use pin_project_lite::pin_project;
use tracing::Span;

pin_project! {
    pub struct LogFuture<F> {
        #[pin]
        pub f: F,
        pub span: Span
    }
}

impl<F> Future for LogFuture<F>
where
    F: Future<Output = Result<Response>>,
{
    type Output = F::Output;

    fn poll(self: std::pin::Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
        let this = self.project();
        let _enter = this.span.enter();
        let res = ready!(this.f.poll(cx))?;
        Poll::Ready(Ok(res))
    }
}
