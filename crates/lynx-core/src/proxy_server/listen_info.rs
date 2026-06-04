use std::sync::Arc;

use http::Extensions;

#[derive(Debug, Clone)]
pub struct ProxyListenInfo {
    pub port: u16,
    pub local_only: bool,
}

pub trait ProxyListenInfoExtensionsExt {
    fn get_proxy_listen_info(&self) -> Arc<ProxyListenInfo>;
}

impl ProxyListenInfoExtensionsExt for Extensions {
    fn get_proxy_listen_info(&self) -> Arc<ProxyListenInfo> {
        self.get::<Arc<ProxyListenInfo>>()
            .expect("proxy listen info not found")
            .clone()
    }
}
