use std::sync::Arc;

use anyhow::{Ok, Result};
use common::tracing_config;
use lynx_core::proxy_server::{
    ProxyServerBuilder, server_ca_manage::ServerCaManagerBuilder,
    server_config::ProxyServerConfigBuilder,
};
use lynx_mock::{client::MockClient, server::MockServer};
use tempdir::TempDir;
mod common;

#[tokio::test]
async fn proxy_test() -> Result<()> {
    tracing_config::init_tracing();

    let mut mock_server = MockServer::new(None);
    mock_server.start_server().await?;

    let temp_dir = TempDir::new("proxy_test")?;
    let temp_dir_path = temp_dir.path();

    let server_config = ProxyServerConfigBuilder::default()
        .root_cert_file_path(temp_dir_path.join("root.pem"))
        .root_key_file_path(temp_dir_path.join("key.pem"))
        .build()?;

    let server_ca_manager = ServerCaManagerBuilder::new(
        server_config.root_cert_file_path.clone(),
        server_config.root_key_file_path.clone(),
    )
    .build()?;
    let server_config_cert = server_ca_manager.ca_cert.clone();

    let mut proxy_server = ProxyServerBuilder::default()
        .custom_certs(Arc::new(vec![mock_server.cert.clone()]))
        .config(Arc::new(server_config))
        .server_ca_manager(Arc::new(server_ca_manager))
        .build()
        .await?;

    proxy_server.run().await?;

    let proxy_addr = format!("http://{}", proxy_server.access_addr_list.first().unwrap());

    let client = MockClient::new(
        Some(vec![mock_server.cert.clone(), server_config_cert]),
        Some(proxy_addr),
    )?;
    client.test_request_http_request(&mock_server).await?;
    client.test_request_https_request(&mock_server).await?;
    client.test_request_websocket(&mock_server).await?;
    client.test_request_tls_websocket(&mock_server).await?;

    Ok(())
}
