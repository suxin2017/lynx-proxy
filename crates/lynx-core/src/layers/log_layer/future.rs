use std::task::{Context, Poll, ready};

use pin_project_lite::pin_project;
use tracing::Span;

pin_project! {
    pub struct LogFuture<F> {
        #[pin]
        pub f: F,
        pub span: Span
    }
}

impl<F, T, E> Future for LogFuture<F>
where
    F: Future<Output = Result<T, E>>,
{
    type Output = Result<T, E>;

    fn poll(self: std::pin::Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
        let this = self.project();
        let _enter = this.span.enter();
        Poll::Ready(ready!(this.f.poll(cx)))
    }
}
