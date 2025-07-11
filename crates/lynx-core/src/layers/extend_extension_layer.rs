use std::{
    sync::Arc,
    task::{Context, Poll},
};

use anyhow::Result;
use http::{Extensions, Request};
use tower::Service;

use crate::{
    client::request_client::RequestClientExt,
    proxy_server::{ClientAddrRequestExt, server_config::ProxyServerConfigExtensionsExt},
};

use super::message_package_layer::{
    MessageEventLayerExt, message_event_store::MessageEventStoreExtensionsExt,
};

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

pub trait DbExtensionsExt {
    fn get_db(&self) -> Arc<sea_orm::DatabaseConnection>;
}

impl DbExtensionsExt for Extensions {
    fn get_db(&self) -> Arc<sea_orm::DatabaseConnection> {
        self.get::<Arc<sea_orm::DatabaseConnection>>()
            .expect("Missing database connection in request")
            .clone()
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
    let message_event_cannel = ex.get_message_event_cannel();
    let message_event_store = ex.get_message_event_store();
    let db = ex.get_db();

    let mut nex = Extensions::new();
    nex.insert(request_client);
    nex.insert(client_addr);
    nex.insert(server_config);
    nex.insert(message_event_cannel);
    nex.insert(message_event_store);
    nex.insert(db);
    Ok(nex)
}
