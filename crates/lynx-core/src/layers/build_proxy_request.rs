use std::{
    future::Future,
    pin::Pin,
    str::FromStr,
    task::{Context, Poll},
};

use anyhow::Result;
use axum::response::Response;
use http::{
    Request, Uri,
    header::{CONNECTION, HOST, PROXY_AUTHORIZATION},
};
use tower::Service;
use url::Url;

use crate::{
    common::Req,
    layers::{extend_extension_layer::clone_extensions, trace_id_layer::service::TraceIdExt},
};

#[derive(Clone)]
pub struct BuildProxyRequestService<S> {
    pub service: S,
}

impl<S> Service<Req> for BuildProxyRequestService<S>
where
    S: Service<Req, Future: Future + Send + 'static, Response = Response>
        + Clone
        + Send
        + Sync
        + 'static,
    S::Future: Send,
    S::Error: From<anyhow::Error>,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.service.poll_ready(cx)
    }

    fn call(&mut self, req: Req) -> Self::Future {
        let mut s = self.service.clone();
        Box::pin(async move {
            let trace_id = req.extensions().get_trace_id();
            let mut extensions = clone_extensions(req.extensions()).map_err(S::Error::from)?;

            extensions.insert(trace_id);
            let (parts, body) = req.into_parts();

            let uri = {
                let url = Url::from_str(parts.uri.to_string().as_str()).map_err(|e| {
                    S::Error::from(anyhow::anyhow!("failed to parse request url: {}", e))
                })?;
                Uri::from_str(url.as_str()).map_err(|e| {
                    S::Error::from(anyhow::anyhow!("failed to build proxy uri: {}", e))
                })?
            };

            let mut req_builder = Request::builder().method(parts.method).uri(uri);

            for (key, value) in parts.headers.iter() {
                if matches!(key, &HOST | &CONNECTION | &PROXY_AUTHORIZATION) {
                    continue;
                }
                req_builder = req_builder.header(key.clone(), value.clone());
            }
            let mut proxy_req = req_builder
                .body(body)
                .map_err(|e| S::Error::from(anyhow::anyhow!(e)))?;

            proxy_req.extensions_mut().extend(extensions);
            s.call(proxy_req).await
        })
    }
}
