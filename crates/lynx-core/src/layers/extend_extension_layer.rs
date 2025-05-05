use std::task::{Context, Poll};

use anyhow::Result;
use http::{Extensions, Request};
use tower::Service;

use crate::{
    client::request_client::RequestClientExt,
    proxy_server::{ClientAddrRequestExt, server_config::ProxyServerConfigExtensionsExt},
};

use super::trace_id_layer::service::TraceIdExt;

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

pub fn clone_extensions(ex: &Extensions) -> Result<Extensions> {
    let request_client = ex
        .get_request_client()
        .ok_or_else(|| anyhow::anyhow!("Missing request client in request"))?;
    let client_addr = ex
        .get_client_addr()
        .ok_or_else(|| anyhow::anyhow!("Missing client address in request"))?;
    let server_config = ex.get_proxy_server_config();
    let trace_id = ex.get_trace_id();

    let mut nex = Extensions::new();
    nex.insert(request_client);
    nex.insert(client_addr);
    nex.insert(server_config);
    nex.insert(trace_id);
    Ok(nex)
}
