use std::sync::Arc;

use anyhow::Result;
use derive_builder::Builder;
use http::{Extensions, Request};
use rcgen::Certificate;

use super::{
    http_client::{HttpClient, HttpClientBuilder},
    websocket_client::{WebsocketClient, WebsocketClientBuilder},
};

#[derive(Builder)]
#[builder(build_fn(skip))]
pub struct RequestClient {
    custom_certs: Option<Arc<Vec<Certificate>>>,
    #[builder(setter(skip))]
    http_client: HttpClient,
    #[builder(setter(skip))]
    websocket_client: WebsocketClient,
}

impl RequestClientBuilder {
    pub fn build(&self) -> Result<RequestClient> {
        let custom_certs = self.custom_certs.clone().flatten();

        let http_client = HttpClientBuilder::default()
            .custom_certs(custom_certs.clone())
            .build()?;
        let websocket_client = WebsocketClientBuilder::default()
            .custom_certs(custom_certs.clone())
            .build()?;

        Ok(RequestClient {
            custom_certs,
            http_client,
            websocket_client,
        })
    }
}

pub type ShareRequestClient = Arc<RequestClient>;

pub trait RequestClientExt {
    fn get_http_client(&self) -> &HttpClient;
    fn get_websocket_client(&self) -> &WebsocketClient;
}

impl RequestClientExt for Extensions {
    fn get_http_client(&self) -> &HttpClient {
        &self
            .get::<ShareRequestClient>()
            .expect("RequestClient not found")
            .http_client
    }

    fn get_websocket_client(&self) -> &WebsocketClient {
        &self
            .get::<ShareRequestClient>()
            .expect("RequestClient not found")
            .websocket_client
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn build_request_client_test() {
        let client = RequestClientBuilder::default().custom_certs(None).build();
        assert!(client.is_ok());
    }
}
