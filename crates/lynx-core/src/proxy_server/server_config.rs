use std::{path::PathBuf, sync::Arc};

use derive_builder::Builder;
use http::Extensions;

#[derive(Builder, Debug, Default, Clone)]
pub struct ProxyServerConfig {
    pub root_cert_file_path: PathBuf,
    pub root_key_file_path: PathBuf,
}

pub trait ProxyServerConfigExtensionsExt {
    fn get_proxy_server_config(&self) -> Arc<ProxyServerConfig>;
}

impl ProxyServerConfigExtensionsExt for Extensions {
    fn get_proxy_server_config(&self) -> Arc<ProxyServerConfig> {
        self.get::<Arc<ProxyServerConfig>>()
            .expect("proxy server config not found")
            .clone()
    }
}
