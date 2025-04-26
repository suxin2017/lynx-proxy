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
    custom_certs: Option<Arc<Vec<Arc<Certificate>>>>,
    #[builder(setter(skip))]
    http_client: Arc<HttpClient>,
    #[builder(setter(skip))]
    websocket_client: Arc<WebsocketClient>,
}

impl RequestClientBuilder {
    pub fn build(&self) -> Result<RequestClient> {
        let custom_certs = self.custom_certs.clone().flatten();

        let http_client = Arc::new(
            HttpClientBuilder::default()
                .custom_certs(custom_certs.clone())
                .build()?,
        );
        let websocket_client = Arc::new(
            WebsocketClientBuilder::default()
                .custom_certs(custom_certs.clone())
                .build()?,
        );

        Ok(RequestClient {
            custom_certs,
            http_client,
            websocket_client,
        })
    }
}

pub type ShareRequestClient = Arc<RequestClient>;

pub trait RequestClientExt {
    fn get_request_client(&self) -> Option<ShareRequestClient>;
    fn get_http_client(&self) -> Arc<HttpClient>;
    fn get_websocket_client(&self) -> Arc<WebsocketClient>;
}

impl RequestClientExt for Extensions {
    fn get_request_client(&self) -> Option<ShareRequestClient> {
        self.get::<ShareRequestClient>().map(|c| Arc::clone(c))
    }

    fn get_http_client(&self) -> Arc<HttpClient> {
        self.get::<ShareRequestClient>()
            .map(|c| Arc::clone(&c.http_client))
            .expect("RequestClient not found")
    }

    fn get_websocket_client(&self) -> Arc<WebsocketClient> {
        self.get::<ShareRequestClient>()
            .map(|c| Arc::clone(&c.websocket_client))
            .expect("RequestClient not found")
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
