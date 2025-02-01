use anyhow::Result;
use reqwest::Certificate;


pub fn build_request_client(
    lynx_core_addr: Option<&str>,
    is_https: bool,
    ca_cert: Option<Certificate>,
) -> Result<reqwest::Client> {
    let mut client = reqwest::Client::builder();
       
    if let Some(lynx_core_addr) = lynx_core_addr {
        let proxy = reqwest::Proxy::all(lynx_core_addr).unwrap();
        client = client.proxy(proxy);
    }
    if is_https {
        client = client.use_rustls_tls();
    }
    if let Some(ca_cert) = ca_cert {
        client = client.add_root_certificate(ca_cert);
    }
    Ok(client.build()?)
}

pub fn build_http_proxy_client(lynx_core_addr: &str) -> reqwest::Client {
    build_request_client(Some(lynx_core_addr), false, None).unwrap()
}

pub fn build_https_proxy_client(lynx_core_addr: &str) -> reqwest::Client {
    build_request_client(Some(lynx_core_addr), true, None).unwrap()
}

pub fn build_http_client() -> reqwest::Client {
    build_request_client(None, false, None).unwrap()
}

pub fn build_https_client(ca_cert: Certificate) -> reqwest::Client {
    build_request_client(None, true, Some(ca_cert)).unwrap()
}
