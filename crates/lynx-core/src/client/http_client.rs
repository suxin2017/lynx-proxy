use std::sync::Arc;

use anyhow::Result;
use bytes::Bytes;
use derive_builder::Builder;
use http_body_util::combinators::BoxBody;
use hyper_rustls::{HttpsConnector, HttpsConnectorBuilder};
use hyper_util::{
    client::legacy::{Client, connect::HttpConnector},
    rt::TokioExecutor,
};
use lynx_cert::gen_client_config_by_cert;
use rcgen::Certificate;

#[derive(Builder)]
#[builder(build_fn(skip))]
struct HttpClient {
    custom_certs: Option<Vec<Arc<Certificate>>>,
    #[builder(setter(skip))]
    client: Client<HttpsConnector<HttpConnector>, BoxBody<Bytes, anyhow::Error>>,
}

impl HttpClientBuilder {
    pub fn build(&self) -> Result<HttpClient> {
        let custom_certs = self.custom_certs.clone().flatten();
        let client_config = gen_client_config_by_cert(custom_certs.clone())?;

        let connector = HttpsConnectorBuilder::new()
            .with_tls_config(client_config)
            .https_or_http()
            .enable_all_versions()
            .build();
        let client_builder = Client::builder(TokioExecutor::new());

        let client = client_builder.build(connector);
        Ok(HttpClient {
            client,
            custom_certs,
        })
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
