use std::sync::Arc;

use anyhow::{Result, anyhow};
use bytes::Bytes;
use http::Uri;
use http_body_util::combinators::BoxBody;
use hyper_http_proxy::{Intercept, Proxy, ProxyConnector};
use hyper_rustls::{HttpsConnector, HttpsConnectorBuilder};
use tokio_rustls::TlsConnector;
use tracing::trace;

use hyper_util::{
    client::{
        legacy::{Client, connect::HttpConnector},
        proxy::matcher,
    },
    rt::TokioExecutor,
};
use lynx_cert::gen_client_config_by_cert;
use rcgen::Certificate;

use super::ProxyType;
use crate::common::{HyperRes, Req};

pub enum HttpClient {
    Direct(Client<HttpsConnector<HttpConnector>, BoxBody<Bytes, anyhow::Error>>),
    Proxy(Client<ProxyConnector<HttpConnector>, BoxBody<Bytes, anyhow::Error>>),
}

#[derive(Default)]
pub struct HttpClientBuilder {
    custom_certs: Option<Arc<Vec<Arc<Certificate>>>>,
    proxy_config: ProxyType,
}

impl HttpClient {
    pub async fn request(&self, req: Req) -> Result<HyperRes> {
        match self {
            HttpClient::Direct(client) => {
                trace!("HTTP Client: Making direct request to {}", req.uri());
                client
                    .request(req)
                    .await
                    .map_err(|e| anyhow!(e).context("http request client error"))
            }
            HttpClient::Proxy(client) => {
                trace!("HTTP Client: Making proxied request to {}", req.uri());
                client
                    .request(req)
                    .await
                    .map_err(|e| anyhow!(e).context("http request client error"))
            }
        }
    }
}

impl HttpClientBuilder {
    pub fn custom_certs(mut self, custom_certs: Option<Arc<Vec<Arc<Certificate>>>>) -> Self {
        self.custom_certs = custom_certs;
        self
    }

    pub fn proxy_config(mut self, proxy_config: ProxyType) -> Self {
        self.proxy_config = proxy_config;
        self
    }

    pub fn build(&self) -> Result<HttpClient> {
        let cert_chain = self.custom_certs.clone();
        let client_config = gen_client_config_by_cert(cert_chain.clone())?;

        match &self.proxy_config {
            ProxyType::None => {
                trace!("HTTP Client: Using direct connection (no proxy)");
                // 直接使用 HTTPS 连接器
                let connector = HttpsConnectorBuilder::new()
                    .with_tls_config(client_config)
                    .https_or_http()
                    .enable_all_versions()
                    .build();

                let client = Client::builder(TokioExecutor::new()).build(connector);
                Ok(HttpClient::Direct(client))
            }
            ProxyType::System => {
                trace!("HTTP Client: Checking for system proxy configuration");
                let matcher = matcher::Matcher::from_system();

                let http_uri = Uri::from_static("http://example.com");
                let https_uri = Uri::from_static("https://example.com");
                let intercept = matcher
                    .intercept(&http_uri)
                    .or(matcher.intercept(&https_uri));

                if let Some(intercept) = intercept {
                    let proxy_uri = intercept.uri().clone();
                    trace!("HTTP Client: Using system proxy: {}", proxy_uri);
                    let proxy = Proxy::new(Intercept::All, proxy_uri);

                    let base_connector = HttpConnector::new();
                    let mut proxy_connector = ProxyConnector::from_proxy(base_connector, proxy)?;
                    proxy_connector.set_tls(Some(TlsConnector::from(Arc::new(client_config))));

                    let client = Client::builder(TokioExecutor::new()).build(proxy_connector);
                    Ok(HttpClient::Proxy(client))
                } else {
                    trace!("HTTP Client: No system proxy found, using direct connection");
                    let connector = HttpsConnectorBuilder::new()
                        .with_tls_config(client_config)
                        .https_or_http()
                        .enable_all_versions()
                        .build();

                    let client = Client::builder(TokioExecutor::new()).build(connector);
                    Ok(HttpClient::Direct(client))
                }
            }
            ProxyType::Custom(proxy_url) => {
                trace!("HTTP Client: Using custom proxy: {}", proxy_url);
                let proxy_uri = proxy_url
                    .parse()
                    .map_err(|e| anyhow!("Invalid proxy URL '{}': {}", proxy_url, e))?;

                // 使用 Intercept::All 来确保所有请求都通过代理
                let proxy = Proxy::new(Intercept::All, proxy_uri);

                let base_connector = HttpConnector::new();
                let mut proxy_connector = ProxyConnector::from_proxy(base_connector, proxy)?;
                proxy_connector.set_tls(Some(TlsConnector::from(Arc::new(client_config))));

                let client = Client::builder(TokioExecutor::new()).build(proxy_connector);
                Ok(HttpClient::Proxy(client))
            }
        }
    }
}

#[cfg(test)]
mod tests {

    use anyhow::Result;
    use http::Uri;
    use http_body_util::BodyExt;

    use super::*;
    use crate::utils::empty;

    #[test]
    fn build_http_client() -> Result<()> {
        let client = HttpClientBuilder::default().custom_certs(None).build();
        assert!(client.is_ok());
        Ok(())
    }

    #[tokio::test]
    #[ignore = "need stable network connect"]
    async fn test_http_request() -> Result<()> {
        let client = HttpClientBuilder::default().custom_certs(None).build()?;

        let url: Uri = "https://example.com".parse()?;
        let req = http::Request::get(url).body(empty())?;
        let response = client.request(req).await?;
        assert_eq!(response.status(), 200);

        let url: Uri = "http://example.com".parse()?;
        let req = http::Request::get(url).body(empty())?;
        let response = client.request(req).await?;
        assert_eq!(response.status(), 200);
        Ok(())
    }

    #[test]
    fn test_proxy_configurations() -> Result<()> {
        // 测试无代理配置
        let client = HttpClientBuilder::default()
            .proxy_config(ProxyType::None)
            .build()?;

        match client {
            HttpClient::Direct(_) => println!("✓ ProxyType::None correctly creates Direct client"),
            HttpClient::Proxy(_) => panic!("Expected Direct client for ProxyType::None"),
        }

        // 测试系统代理配置
        let client = HttpClientBuilder::default()
            .proxy_config(ProxyType::System)
            .build()?;

        match client {
            HttpClient::Direct(_) => {
                println!("ⓘ ProxyType::System falls back to Direct (no system proxy found)")
            }
            HttpClient::Proxy(_) => println!("✓ ProxyType::System correctly creates Proxy client"),
        }

        // 测试自定义代理配置
        let client = HttpClientBuilder::default()
            .proxy_config(ProxyType::Custom("http://127.0.0.1:7788".to_string()))
            .build()?;

        match client {
            HttpClient::Proxy(_) => println!("✓ ProxyType::Custom correctly creates Proxy client"),
            HttpClient::Direct(_) => panic!("Expected Proxy client for ProxyType::Custom"),
        }

        // 测试无效的自定义代理 URL (使用明显无效的格式)
        let result = HttpClientBuilder::default()
            .proxy_config(ProxyType::Custom("not-a-valid-uri-at-all!@#$%".to_string()))
            .build();

        assert!(result.is_err(), "Expected error for invalid proxy URL");
        println!("✓ Invalid proxy URL correctly returns error");

        // 测试有效的代理 URL 格式
        let valid_proxies = vec![
            "http://proxy.example.com:8080",
            "https://proxy.example.com:8080",
            "socks5://proxy.example.com:1080",
            "http://user:pass@proxy.example.com:8080",
        ];

        for proxy_url in valid_proxies {
            let client = HttpClientBuilder::default()
                .proxy_config(ProxyType::Custom(proxy_url.to_string()))
                .build()?;

            match client {
                HttpClient::Proxy(_) => {
                    println!("✓ Valid proxy URL '{}' creates Proxy client", proxy_url)
                }
                HttpClient::Direct(_) => {
                    panic!("Expected Proxy client for valid proxy URL '{}'", proxy_url)
                }
            }
        }

        Ok(())
    }

    #[test]
    fn test_system_proxy_detection() -> Result<()> {
        // 测试系统代理检测逻辑
        let matcher = matcher::Matcher::from_system();
        let test_uri: http::Uri = "https://example.com".parse().unwrap();

        if let Some(intercept) = matcher.intercept(&test_uri) {
            println!("✓ System proxy detected: {}", intercept.uri());

            // 检查是否有认证信息
            if let Some(auth) = intercept.basic_auth() {
                println!("  - Has basic auth: {}", auth.to_str().unwrap_or("invalid"));
            }

            if let Some((user, pass)) = intercept.raw_auth() {
                println!("  - Has raw auth: {}:{}", user, pass);
            }
        } else {
            println!("ⓘ No system proxy detected for HTTPS requests");
        }

        // 测试 HTTP 请求
        let test_uri: http::Uri = "http://example.com".parse().unwrap();
        if let Some(intercept) = matcher.intercept(&test_uri) {
            println!("✓ System proxy detected for HTTP: {}", intercept.uri());
        } else {
            println!("ⓘ No system proxy detected for HTTP requests");
        }

        Ok(())
    }

    #[tokio::test]
    #[ignore = "requires network connection and may use proxy"]
    async fn test_real_network_with_proxy() -> Result<()> {
        // 测试使用系统代理的真实网络请求
        let client = HttpClientBuilder::default()
            .proxy_config(ProxyType::System)
            .build()?;

        let url: Uri = "http://httpbin.org/ip".parse()?;
        let req = http::Request::get(url).body(empty())?;

        match client.request(req).await {
            std::result::Result::Ok(response) => {
                let status = response.status();
                println!("✓ System proxy request succeeded");
                println!("  Status: {}", status);
                println!("  Response headers: {:?}", response.headers());

                // 读取响应体
                let body_bytes = response.into_body().collect().await?.to_bytes();
                let body_str = String::from_utf8_lossy(&body_bytes);
                println!("  Response body: {}", body_str);

                assert!(status.is_success(), "Expected successful response");
            }
            Err(e) => {
                println!(
                    "ⓘ System proxy request failed (this might be expected): {}",
                    e
                );
                // 系统代理请求失败是可以接受的，因为可能没有配置代理或代理不可用
            }
        }

        // 测试使用自定义代理的请求
        let client = HttpClientBuilder::default()
            .proxy_config(ProxyType::Custom("http://127.0.0.1:7788".to_string()))
            .build()?;

        let url: Uri = "http://httpbin.org/headers".parse()?;
        let req = http::Request::get(url).body(empty())?;

        match client.request(req).await {
            std::result::Result::Ok(response) => {
                let status = response.status();
                println!("✓ Custom proxy request succeeded");
                println!("  Status: {}", status);

                let body_bytes = response.into_body().collect().await?.to_bytes();
                let body_str = String::from_utf8_lossy(&body_bytes);
                println!("  Response body: {}", body_str);

                assert!(status.is_success(), "Expected successful response");
            }
            Err(e) => {
                println!(
                    "ⓘ Custom proxy request failed (proxy may not be running): {}",
                    e
                );
                // 自定义代理失败也是可以接受的，因为用户可能没有运行代理服务器
            }
        }

        // 测试直接连接
        let client = HttpClientBuilder::default()
            .proxy_config(ProxyType::None)
            .build()?;

        let url: Uri = "https://httpbin.org/user-agent".parse()?;
        let req = http::Request::get(url).body(empty())?;

        let response = client.request(req).await?;
        println!("✓ Direct connection request succeeded");
        println!("  Status: {}", response.status());

        assert!(
            response.status().is_success(),
            "Expected successful response for direct connection"
        );

        Ok(())
    }

    #[tokio::test]
    #[ignore = "requires network connection"]
    async fn test_proxy_vs_direct_comparison() -> Result<()> {
        // 比较代理和直接连接的响应，验证代理是否正常工作
        let test_url = "http://httpbin.org/ip";

        // 直接连接获取IP
        let direct_client = HttpClientBuilder::default()
            .proxy_config(ProxyType::None)
            .build()?;

        let url: Uri = test_url.parse()?;
        let req = http::Request::get(url).body(empty())?;
        let direct_response = direct_client.request(req).await?;
        let direct_body = direct_response.into_body().collect().await?.to_bytes();
        let direct_ip = String::from_utf8_lossy(&direct_body);

        println!("Direct connection IP response: {}", direct_ip.trim());

        // 系统代理连接获取IP
        let proxy_client = HttpClientBuilder::default()
            .proxy_config(ProxyType::System)
            .build()?;

        let url: Uri = test_url.parse()?;
        let req = http::Request::get(url).body(empty())?;

        match proxy_client.request(req).await {
            std::result::Result::Ok(proxy_response) => {
                let proxy_body = proxy_response.into_body().collect().await?.to_bytes();
                let proxy_ip = String::from_utf8_lossy(&proxy_body);

                println!("System proxy IP response: {}", proxy_ip.trim());

                if direct_ip.trim() != proxy_ip.trim() {
                    println!("✓ Proxy is working - different IP detected");
                } else {
                    println!(
                        "ⓘ Same IP detected - proxy might not be configured or is transparent"
                    );
                }
            }
            Err(e) => {
                println!("ⓘ System proxy request failed: {}", e);
            }
        }

        Ok(())
    }
}
