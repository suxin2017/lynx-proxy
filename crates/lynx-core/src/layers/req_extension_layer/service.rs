use std::task::{Context, Poll};

use http::Request;
use tower::Service;

#[derive(Debug, Clone)]
pub struct RequestExtensionService<S, V> {
    pub service: S,
    pub value: V,
}

impl<S, Body, V> Service<Request<Body>> for RequestExtensionService<S, V>
where
    S: Service<Request<Body>>,
    V: Clone + Sync + Send + 'static,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = S::Future;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.service.poll_ready(cx)
    }

    fn call(&mut self, mut request: Request<Body>) -> Self::Future {
        request.extensions_mut().insert(self.value.clone());
        self.service.call(request)
    }
}
