use std::task::{Context, Poll};

use http::{
    Request, Uri, Version,
    uri::{Authority, Scheme},
};
use tower::Service;


#[derive(Debug, Clone)]
pub struct ConnectReqPatchService<S> {
    pub service: S,
    pub authority: Authority,
    pub version: Version,
}

impl<S, Body> Service<Request<Body>> for ConnectReqPatchService<S>
where
    S: Service<Request<Body>>,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = S::Future;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.service.poll_ready(cx)
    }

    fn call(&mut self, request: Request<Body>) -> Self::Future {
        let req = if matches!(self.version, Version::HTTP_10 | Version::HTTP_11) {
            let (mut parts, body) = request.into_parts();

            parts.uri = {
                let mut parts = parts.uri.into_parts();
                parts.scheme = Some(Scheme::HTTP);
                parts.authority = Some(self.authority.clone());
                Uri::from_parts(parts).expect("Failed to build URI")
            };
            Request::from_parts(parts, body)
        } else {
            request
        };

        self.service.call(req)
    }
}

pub struct ConnectReqPatchLayer {
    authority: Authority,
    version: Version,
}

impl ConnectReqPatchLayer {
    pub fn new(authority: Authority, version: Version) -> Self {
        Self { authority, version }
    }
}

impl<S> tower::Layer<S> for ConnectReqPatchLayer {
    type Service = ConnectReqPatchService<S>;

    fn layer(&self, service: S) -> Self::Service {
        ConnectReqPatchService {
            service,
            authority: self.authority.clone(),
            version: self.version.clone(),
        }
    }
}
