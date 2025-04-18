use core::fmt;
use std::task::{Context, Poll, ready};

use pin_project_lite::pin_project;
use tower::{Layer, Service};

pin_project! {
    pub struct LogFuture<F> {
        #[pin]
        f: F,
    }
}

impl<F> Future for LogFuture<F>
where
    F: Future,
{
    type Output = F::Output;

    fn poll(self: std::pin::Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
        let this = self.project();
        let res = ready!(this.f.poll(cx));
        // println!("response = {:?}", res);
        Poll::Ready(res)
    }
}
