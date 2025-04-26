use std::sync::Arc;

use anyhow::{Ok, Result};
use common::tracing_config;
use lynx_core::{
    proxy_server::ProxyServerBuilder,
    server_context::{get_ca_manager, set_up_context},
};
use lynx_mock::{client::MockClient, server::MockServer};
mod common;

#[tokio::test]
async fn proxy_test() -> Result<()> {
    tracing_config::init_tracing();

    let mut mock_server = MockServer::new(None);
    mock_server.write_cert_to_file()?;
    mock_server.start_server().await?;

    set_up_context(Default::default()).await;
    let proxy_server_ca_manager = get_ca_manager();

    let mut proxy_server = ProxyServerBuilder::default()
        .custom_certs(Arc::new(vec![mock_server.cert.clone()]))
        .build()
        .await?;
    proxy_server.run().await?;
    let proxy_addr = format!("http://{}", proxy_server.access_addr_list.first().unwrap());

    let client = MockClient::new(
        Some(vec![
            mock_server.cert.clone(),
            proxy_server_ca_manager.ca_cert.clone(),
        ]),
        Some(proxy_addr),
    )?;
    client.test_request_http_request(&mock_server).await?;
    client.test_request_https_request(&mock_server).await?;
    client.test_request_websocket(&mock_server).await?;
    client.test_request_tls_websocket(&mock_server).await?;

    Ok(())
}
