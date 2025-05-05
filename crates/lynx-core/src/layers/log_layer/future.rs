use std::task::{Context, Poll, ready};

use anyhow::Result;
use pin_project_lite::pin_project;
use tracing::{Span, info};

use crate::common::Res;

pin_project! {
    pub struct LogFuture<F> {
        #[pin]
        pub f: F,
        pub span: Span
    }
}

impl<F> Future for LogFuture<F>
where
    F: Future<Output = Result<Res>>,
{
    type Output = F::Output;

    fn poll(self: std::pin::Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
        let this = self.project();
        let _enter = this.span.enter();
        let res = ready!(this.f.poll(cx))?;

        this.span.record("status", res.status().as_u16());
        info!("request completed");
        Poll::Ready(Ok(res))
    }
}
