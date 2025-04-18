use std::{
    pin::Pin,
    sync::Arc,
    task::{Context, Poll},
};

use bytes::Bytes;
use futures_util::ready;
use http::{HeaderValue, Response};
use http_body_util::{Full, combinators::BoxBody};
use hyper::{Request, body::Incoming, service::Service};
use pin_project_lite::pin_project;

#[derive(Debug, Clone)]
pub struct MarkService<S> {
    inner: S,
    mark: Arc<String>,
}
impl<S> MarkService<S> {
    pub fn new(inner: S, mark: Arc<String>) -> Self {
        MarkService { inner, mark }
    }
}
type Req = Request<Incoming>;
type Res = Response<BoxBody<Bytes, anyhow::Error>>;

impl<S> Service<Req> for MarkService<S>
where
    S: Service<Req, Response = Res>,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = MarkFuture<S::Future>;
    fn call(&self, req: Req) -> Self::Future {
        MarkFuture {
            future: self.inner.call(req),
            mark: self.mark.clone(),
        }
    }
}

pin_project! {
    /// Response future for [`SetResponseHeader`].
    #[derive(Debug)]
    pub struct MarkFuture<F> {
        #[pin]
        future: F,
        mark: Arc<String>,
    }
}

impl<F, E> Future for MarkFuture<F>
where
    F: Future<Output = Result<Res, E>>,
{
    type Output = F::Output;

    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
        let this = self.project();
        let mut res = ready!(this.future.poll(cx)?);
        res.headers_mut()
            .insert("X-Mark-Addr", HeaderValue::from_str(this.mark).unwrap());
        Poll::Ready(Ok(res))
    }
}
