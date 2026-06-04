//! One-shot WebSocket traffic through Lynx proxy to a running lynx-mock server.
//!
//! Prereqs: proxy on 7788, mock server on 3001 (`cargo run -p lynx-mock --example start_test_server`).
use anyhow::Result;
use lynx_cert::read_cert_and_key_by_file;
use lynx_mock::{client::MockClient, server::MockServer};
use std::path::PathBuf;
use std::sync::Arc;

#[tokio::main]
async fn main() -> Result<()> {
    let mock_port: u16 = std::env::var("LYNX_MOCK_PORT")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(3001);

    let proxy_url = std::env::var("LYNX_PROXY").unwrap_or_else(|_| "http://127.0.0.1:7788".into());

    let temp_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("examples/temp");
    let cert_path = temp_dir.join("cert.pem");
    let key_path = temp_dir.join("key.pem");
    if !cert_path.exists() || !key_path.exists() {
        anyhow::bail!(
            "mock cert not found under {} — run `start_test_server` once to generate certs",
            temp_dir.display()
        );
    }

    let (cert, _key) = read_cert_and_key_by_file(&key_path, &cert_path)?;
    let cert = Arc::new(cert);

    let client = MockClient::new(Some(vec![cert]), Some(proxy_url.clone()))?;

    let server = MockServer::new(Some(mock_port));
    let ws_http = server.get_websocket_path();
    let ws_tls = server.get_tls_websocket_path();

    println!("proxy: {proxy_url}");
    println!("ws via proxy (http): {ws_http}");
    client.0.proxy_ws(&ws_http).await?;

    println!("ws via proxy (tls): {ws_tls}");
    client.0.proxy_ws(&ws_tls).await?;

    println!("ok");
    Ok(())
}
