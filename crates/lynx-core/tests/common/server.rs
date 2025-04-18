use std::sync::Arc;

use anyhow::Result;
use async_once_cell::OnceCell;
use lynx_mock::server::MockServer;
use rcgen::Certificate;

pub static MOCK_SERVER: OnceCell<MockServer> = OnceCell::new();
pub static MOCK_SERVER_CERT: OnceCell<Arc<Certificate>> = OnceCell::new();

pub async fn setup_server() -> Result<()> {
    MOCK_SERVER
        .get_or_try_init(async {
            let mut server = MockServer::new(None);
            let cert = server.cert.clone();
            MOCK_SERVER_CERT.get_or_init(async { cert }).await;
            server.write_cert_to_file()?;
            server.start_server().await?;
            Ok::<_, anyhow::Error>(server)
        })
        .await?;

    Ok(())
}
