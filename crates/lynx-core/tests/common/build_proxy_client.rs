use anyhow::Result;
use lynx_core::server_context::CA_MANAGER;

use super::constant::TEST_ROOT_CA_CERT;

pub fn build_request_client(
    lynx_core_addr: Option<&str>,
    is_https: bool,
) -> Result<reqwest::Client> {
    let mut client = reqwest::Client::builder();

    if let Some(lynx_core_addr) = lynx_core_addr {
        let proxy = reqwest::Proxy::all(lynx_core_addr).unwrap();
        client = client.proxy(proxy);
    }
    if is_https {
        client = client.use_rustls_tls();
        client = client.add_root_certificate(TEST_ROOT_CA_CERT.clone());
        let proxy_ca_cert =
            reqwest::Certificate::from_pem(CA_MANAGER.get().unwrap().ca_cert.pem().as_bytes())
                .unwrap();
        client = client.add_root_certificate(proxy_ca_cert);
    }

    Ok(client.build()?)
}

pub fn build_http_proxy_client(lynx_core_addr: &str) -> reqwest::Client {
    build_request_client(Some(lynx_core_addr), false).unwrap()
}

pub fn build_https_proxy_client(lynx_core_addr: &str) -> reqwest::Client {
    build_request_client(Some(lynx_core_addr), true).unwrap()
}

pub fn build_http_client() -> reqwest::Client {
    build_request_client(None, false).unwrap()
}

pub fn build_https_client() -> reqwest::Client {
    build_request_client(None, true).unwrap()
}
