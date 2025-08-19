use std::{sync::Arc, time::Duration};

use anyhow::{Result, anyhow};
use rcgen::Certificate;
use reqwest::{ClientBuilder, Proxy};
use tokio_rustls::rustls::{ClientConfig, RootCertStore};
use tracing::trace;
use webpki_roots::TLS_SERVER_ROOTS;

#[derive(Debug, Clone, Default)]
pub enum ReqwestProxyType {
    #[default]
    None,
    System,
    Custom(String), // URL
}

impl ReqwestProxyType {
    /// Convert from database proxy config to ProxyType
    pub fn from_proxy_config(proxy_type: &str, url: Option<&String>) -> Self {
        match proxy_type {
            "none" => ReqwestProxyType::None,
            "system" => ReqwestProxyType::System,
            "custom" => {
                if let Some(url) = url {
                    ReqwestProxyType::Custom(url.clone())
                } else {
                    ReqwestProxyType::None
                }
            }
            _ => ReqwestProxyType::None,
        }
    }
}


pub struct ReqwestClientBuilder {
    client_builder: ClientBuilder,
}

impl Default for ReqwestClientBuilder {
    fn default() -> Self {
        Self {
            client_builder: ClientBuilder::new(),
        }
    }
}

impl ReqwestClientBuilder {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_proxy(mut self, proxy: ReqwestProxyType) -> Result<Self> {
        match proxy {
            ReqwestProxyType::None => {
                self.client_builder = self.client_builder.no_proxy();
            }
            ReqwestProxyType::System => {
                // Use system proxy (default behavior in reqwest)
                // Don't set any explicit proxy configuration
            }
            ReqwestProxyType::Custom(url) => {
                let proxy = Proxy::all(url)
                    .map_err(|e| anyhow!("failed to configure custom proxy: {:?}", e))?;
                self.client_builder = self.client_builder.proxy(proxy);
            }
        }
        Ok(self)
    }

    pub fn with_custom_certs(mut self, certs: Arc<Vec<Arc<Certificate>>>) -> Result<Self> {
        trace!(
            "Using custom certificates: {} certificates loaded",
            certs.len()
        );
        let mut root_cert_store = RootCertStore::empty();

        // Add webpki roots
        root_cert_store.extend(TLS_SERVER_ROOTS.iter().cloned()); // Add custom certificates
        for cert in certs.as_ref() {
            root_cert_store
                .add(cert.der().to_owned())
                .map_err(|e| anyhow!("failed to add custom certificate: {:?}", e))?;
        }

        let client_config = ClientConfig::builder()
            .with_root_certificates(root_cert_store)
            .with_no_client_auth();

        self.client_builder = self.client_builder.use_preconfigured_tls(client_config);
        Ok(self)
    }

    pub fn with_timeout(mut self, timeout: Duration) -> Result<Self> {
        self.client_builder = self.client_builder.timeout(timeout);
        Ok(self)
    }

    pub fn build(self) -> Result<reqwest::Client> {
        self.client_builder
            .build()
            .map_err(|e| anyhow!("failed to build reqwest client: {:?}", e))
    }
}

#[cfg(test)]
mod reqewst_tests {
    use eventsource_stream::Eventsource;
    use futures_util::{SinkExt, StreamExt, TryStreamExt};
    use reqwest_websocket::{Message, RequestBuilderExt};

    use super::*;

    #[tokio::test]
    async fn test_http() -> Result<()> {
        let client = ReqwestClientBuilder::new()
            .with_proxy(ReqwestProxyType::None)?
            .with_timeout(Duration::from_secs(10))?
            .build()?;

        let response = client.get("http://httpbin.org/get").send().await?;
        assert!(response.status().is_success());
        Ok(())
    }

    #[tokio::test]
    async fn test_wss() -> Result<()> {
        let client = ReqwestClientBuilder::new()
            .with_proxy(ReqwestProxyType::None)?
            .build()?;

        let response = client
            .get("wss://echo.websocket.org")
            .upgrade()
            .send()
            .await?;
        assert!(response.status().is_success());

        // Turns the response into a WebSocket stream.
        let mut websocket = response.into_websocket().await?;

        // The WebSocket implements `Sink<Message>`.
        websocket.send(Message::Text("Hello, World".into())).await?;

        // The WebSocket is also a `TryStream` over `Message`s.
        while let Some(message) = websocket.try_next().await? {
            if let Message::Text(text) = message {
                println!("received: {text}")
            }
        }
        Ok(())
    }
    #[tokio::test]
    async fn test_sse() -> Result<()> {
        let client = ReqwestClientBuilder::new()
            .with_proxy(ReqwestProxyType::None)?
            .build()?;

        let response = client
            .get("https://stream.wikimedia.org/v2/stream/recentchange")
            .send()
            .await?;
        assert!(response.status().is_success());

        let mut stream = response.bytes_stream().eventsource();
        while let Some(event) = stream.next().await {
            match event {
                Ok(event) => println!("received event[type={}]: {}", event.event, event.data),
                Err(e) => eprintln!("error occured: {:#?}", e),
            }
        }
        Ok(())
    }
}
