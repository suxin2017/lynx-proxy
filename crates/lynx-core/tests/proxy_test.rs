use anyhow::{Ok, Result};
use common::tracing_config;
use lynx_core::{server::Server, server_context::set_up_context};
use lynx_mock::{client::MockClient, server::MockServer};
mod common;

#[tokio::test]
async fn proxy_test() -> Result<()> {
    tracing_config::init_tracing();    
    set_up_context(Default::default()).await;
    let mut lynx_core = Server::new(Default::default());
    lynx_core.run().await.unwrap();
    let proxy_addr = format!("http://{}", lynx_core.access_addr_list.first().unwrap());

    let mut server = MockServer::new(None);
    server.write_cert_to_file()?;
    server.start_server().await?;
    let client = MockClient::new(Some(vec![server.cert.clone()]), Some(proxy_addr))?;
    client.test_request_http_request(&server).await?;
    client.test_request_websocket(&server).await?;

    Ok(())
}
