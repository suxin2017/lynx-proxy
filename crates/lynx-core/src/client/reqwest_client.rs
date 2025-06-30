use std::{fmt::Debug, sync::Arc};

use anyhow::{Result, anyhow};
use rcgen::Certificate;
use reqwest::{Client, ClientBuilder, Proxy};
use tokio_rustls::rustls::{ClientConfig, RootCertStore};
use tracing::info;

use super::ProxyType;

pub struct ReqwestClient {
    client: Client,
}

impl Debug for ReqwestClient {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("ReqwestClient").finish_non_exhaustive()
    }
}

#[derive(Default)]
pub struct ReqwestClientBuilder {
    custom_certs: Option<Arc<Vec<Arc<Certificate>>>>,
    proxy_config: ProxyType,
}

impl ReqwestClient {
    /// Get the underlying reqwest client for custom requests
    pub fn client(&self) -> &Client {
        &self.client
    }
}

impl ReqwestClientBuilder {
    /// Set custom certificates for the client
    pub fn custom_certs(mut self, custom_certs: Option<Arc<Vec<Arc<Certificate>>>>) -> Self {
        self.custom_certs = custom_certs;
        self
    }

    /// Set proxy configuration for the client
    pub fn proxy_config(mut self, proxy_config: ProxyType) -> Self {
        self.proxy_config = proxy_config;
        self
    }

    /// Build the ReqwestClient
    pub fn build(&self) -> Result<ReqwestClient> {
        let mut client_builder = ClientBuilder::new();

        // Configure custom certificates if provided
        if let Some(cert_chain) = &self.custom_certs {
            info!(
                "Using custom certificates: {} certificates loaded",
                cert_chain.len()
            );
            let mut root_cert_store = RootCertStore::empty();

            // Add webpki roots
            root_cert_store.extend(webpki_roots::TLS_SERVER_ROOTS.iter().cloned()); // Add custom certificates
            for cert in cert_chain.as_ref() {
                root_cert_store
                    .add(cert.der().to_owned())
                    .map_err(|e| anyhow!("failed to add custom certificate: {:?}", e))?;
            }

            let client_config = ClientConfig::builder()
                .with_root_certificates(root_cert_store)
                .with_no_client_auth();

            client_builder = client_builder.use_preconfigured_tls(client_config);
        } else {
            info!("Using default TLS configuration with webpki roots");
            // Use default TLS configuration with webpki roots
            client_builder = client_builder.use_rustls_tls();
        }

        // Configure proxy if provided
        match &self.proxy_config {
            ProxyType::None => {
                info!("Proxy configuration: None (explicitly disabled)");
                // Explicitly disable proxy
                client_builder = client_builder.no_proxy();
            }
            ProxyType::System => {
                info!("Proxy configuration: System (using system proxy settings)");
                // Use system proxy (default behavior in reqwest)
                // Don't set any explicit proxy configuration
            }
            ProxyType::Custom(url) => {
                info!("Proxy configuration: Custom proxy URL: {}", url);
                let proxy = Proxy::all(url)
                    .map_err(|e| anyhow!("failed to configure custom proxy: {:?}", e))?;
                client_builder = client_builder.proxy(proxy);
            }
        }

        let client = client_builder
            .build()
            .map_err(|e| anyhow!(e).context("failed to build reqwest client"))?;

        info!("ReqwestClient built successfully");

        Ok(ReqwestClient { client })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn build_reqwest_client() -> Result<()> {
        let client = ReqwestClientBuilder::default().custom_certs(None).build();
        assert!(client.is_ok());
        Ok(())
    }

    #[tokio::test]
    #[ignore = "need stable network connect"]
    async fn test_custom_request() -> Result<()> {
        let client = ReqwestClientBuilder::default().custom_certs(None).build()?;

        let url = "https://httpbin.org/headers";
        let response = client
            .client()
            .get(url)
            .header("X-Custom-Header", "test-value")
            .send()
            .await?;

        assert!(response.status().is_success());

        Ok(())
    }
}
