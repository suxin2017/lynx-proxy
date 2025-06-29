use std::sync::Arc;

use anyhow::Result;
use http::Extensions;
use rcgen::Certificate;

use crate::client::{ProxyType, ReqwestClient, ReqwestClientBuilder};

use super::{
    http_client::{HttpClient, HttpClientBuilder},
    websocket_client::{WebsocketClient, WebsocketClientBuilder},
};

#[derive(Clone)]
pub struct RequestClient {
    http_client: Arc<HttpClient>,
    websocket_client: Arc<WebsocketClient>,
    reqwest_client: Arc<ReqwestClient>,
}

#[derive(Default)]
pub struct RequestClientBuilder {
    custom_certs: Option<Arc<Vec<Arc<Certificate>>>>,
    api_custom_certs: Option<Arc<Vec<Arc<Certificate>>>>,
    proxy_requests_config: ProxyType,
    api_debug_proxy_config: ProxyType,
}

impl RequestClientBuilder {
    pub fn custom_certs(mut self, custom_certs: Option<Arc<Vec<Arc<Certificate>>>>) -> Self {
        self.custom_certs = custom_certs;
        self
    }
    pub fn api_custom_certs(
        mut self,
        api_custom_certs: Option<Arc<Vec<Arc<Certificate>>>>,
    ) -> Self {
        self.api_custom_certs = api_custom_certs;
        self
    }

    pub fn proxy_requests_config(mut self, proxy_config: ProxyType) -> Self {
        self.proxy_requests_config = proxy_config;
        self
    }

    pub fn api_debug_proxy_config(mut self, proxy_config: ProxyType) -> Self {
        self.api_debug_proxy_config = proxy_config;
        self
    }

    pub fn build(&self) -> Result<RequestClient> {
        let custom_certs = self.custom_certs.clone();

        let http_client = Arc::new(
            HttpClientBuilder::default()
                .custom_certs(custom_certs.clone())
                .proxy_config(self.proxy_requests_config.clone())
                .build()?,
        );
        let websocket_client = Arc::new(
            WebsocketClientBuilder::default()
                .custom_certs(custom_certs)
                .build()?,
        );

        let reqwest_client = Arc::new(
            ReqwestClientBuilder::default()
                .custom_certs(self.api_custom_certs.clone())
                .proxy_config(self.api_debug_proxy_config.clone())
                .build()?,
        );

        Ok(RequestClient {
            reqwest_client,
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
    fn get_reqwest_client(&self) -> Arc<ReqwestClient>;
}

impl RequestClientExt for Extensions {
    fn get_request_client(&self) -> Option<ShareRequestClient> {
        self.get::<ShareRequestClient>().map(Arc::clone)
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

    fn get_reqwest_client(&self) -> Arc<ReqwestClient> {
        self.get::<ShareRequestClient>()
            .map(|c| Arc::clone(&c.reqwest_client))
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
