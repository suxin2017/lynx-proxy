use std::task::{Context, Poll};

use http::{Extensions, Request};
use tower::Service;

#[derive(Debug, Clone)]
pub struct ExtendExtensionsService<S> {
    pub service: S,
    pub old_extensions: Extensions,
}

impl<S, Body> Service<Request<Body>> for ExtendExtensionsService<S>
where
    S: Service<Request<Body>>,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = S::Future;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.service.poll_ready(cx)
    }

    fn call(&mut self, mut request: Request<Body>) -> Self::Future {
        request.extensions_mut().extend(self.old_extensions.clone());

        self.service.call(request)
    }
}

pub struct ExtendExtensionsLayer {
    old_extensions: Extensions,
}

impl ExtendExtensionsLayer {
    pub fn new(old_extensions: Extensions) -> Self {
        Self { old_extensions }
    }
}

impl<S> tower::Layer<S> for ExtendExtensionsLayer {
    type Service = ExtendExtensionsService<S>;

    fn layer(&self, service: S) -> Self::Service {
        ExtendExtensionsService {
            service,
            old_extensions: self.old_extensions.clone(),
        }
    }
}
