pub mod http_client;
pub mod request_client;
pub mod reqwest_client;
pub mod websocket_client;

#[derive(Debug, Clone)]
pub enum ProxyType {
    None,
    System,
    Custom(String), // URL
}

impl Default for ProxyType {
    fn default() -> Self {
        ProxyType::None
    }
}

impl ProxyType {
    /// Convert from database proxy config to ProxyType
    pub fn from_proxy_config(proxy_type: &str, url: Option<&String>) -> Self {
        match proxy_type {
            "none" => ProxyType::None,
            "system" => ProxyType::System,
            "custom" => {
                if let Some(url) = url {
                    ProxyType::Custom(url.clone())
                } else {
                    ProxyType::None
                }
            }
            _ => ProxyType::None,
        }
    }
}

pub use request_client::RequestClient;
pub use reqwest_client::{ReqwestClient, ReqwestClientBuilder};
