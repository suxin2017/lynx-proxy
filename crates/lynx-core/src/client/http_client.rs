use std::sync::Arc;

use anyhow::{Result, anyhow};
use bytes::Bytes;
use http_body_util::combinators::BoxBody;
use hyper_rustls::{HttpsConnector, HttpsConnectorBuilder};
use hyper_util::{
    client::legacy::{Client, connect::HttpConnector},
    rt::TokioExecutor,
};
use lynx_cert::gen_client_config_by_cert;
use rcgen::Certificate;

use crate::common::{HyperRes, Req};

pub struct HttpClient {
    client: Client<HttpsConnector<HttpConnector>, BoxBody<Bytes, anyhow::Error>>,
}

#[derive(Default)]
pub struct HttpClientBuilder {
    custom_certs: Option<Arc<Vec<Arc<Certificate>>>>,
}

impl HttpClient {
    pub async fn request(&self, req: Req) -> Result<HyperRes> {
        self.client
            .request(req)
            .await
            .map_err(|e| anyhow!(e).context("http request client error"))
    }
}

impl HttpClientBuilder {
    pub fn custom_certs(mut self, custom_certs: Option<Arc<Vec<Arc<Certificate>>>>) -> Self {
        self.custom_certs = custom_certs;
        self
    }

    pub fn build(&self) -> Result<HttpClient> {
        let cert_chain = self.custom_certs.clone();

        let client_config = gen_client_config_by_cert(cert_chain.clone())?;

        let connector = HttpsConnectorBuilder::new()
            .with_tls_config(client_config)
            .https_or_http()
            .enable_all_versions()
            .build();
        let client_builder = Client::builder(TokioExecutor::new());

        let client = client_builder.build(connector);
        Ok(HttpClient { client })
    }
}

#[cfg(test)]
mod tests {
    use anyhow::Ok;

    use super::*;

    #[test]
    fn build_http_client() -> Result<()> {
        let client = HttpClientBuilder::default().custom_certs(None).build();
        assert!(client.is_ok());
        Ok(())
    }

    #[tokio::test]
    #[ignore = "need network connect"]
    async fn test_http_request() -> Result<()> {
        let client = HttpClientBuilder::default().custom_certs(None).build()?;

        let url = "https://example.com";
        let response = client.client.get(url.parse()?).await?;
        assert_eq!(response.status(), 200);
        let url = "http://example.com";
        let response = client.client.get(url.parse()?).await?;
        assert_eq!(response.status(), 200);
        Ok(())
    }
}
