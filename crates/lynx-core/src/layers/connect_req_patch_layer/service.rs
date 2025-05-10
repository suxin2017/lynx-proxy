use std::task::{Context, Poll};

use http::{
    Request, Uri, Version,
    uri::{Authority, Scheme},
};
use tower::Service;
use tracing::info;

use crate::common::Req;

#[derive(Debug, Clone)]
pub struct ConnectReqPatchService<S> {
    pub service: S,
    pub authority: Authority,
    pub schema: Scheme,
}

impl<S> Service<Req> for ConnectReqPatchService<S>
where
    S: Service<Req>,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = S::Future;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.service.poll_ready(cx)
    }

    fn call(&mut self, request: Req) -> Self::Future {
        let req = if matches!(request.version(), Version::HTTP_10 | Version::HTTP_11) {
            let (mut parts, body) = request.into_parts();
            parts.uri = {
                let mut parts = parts.uri.into_parts();
                info!("authority: {:?}", self.authority);
                info!("schema: {:?}", self.schema);
                parts.scheme = Some(self.schema.clone());
                parts.authority = Some(self.authority.clone());
                Uri::from_parts(parts).expect("Failed to build URI")
            };
            info!("req uri {:#?}", parts.uri.to_string());
            Request::from_parts(parts, body)
        } else {
            request
        };

        self.service.call(req)
    }
}

pub struct ConnectReqPatchLayer {
    authority: Authority,
    schema: Scheme,
}

impl ConnectReqPatchLayer {
    pub fn new(authority: Authority, schema: Scheme) -> Self {
        Self { authority, schema }
    }
}

impl<S> tower::Layer<S> for ConnectReqPatchLayer {
    type Service = ConnectReqPatchService<S>;

    fn layer(&self, service: S) -> Self::Service {
        ConnectReqPatchService {
            service,
            authority: self.authority.clone(),
            schema: self.schema.clone(),
        }
    }
}
