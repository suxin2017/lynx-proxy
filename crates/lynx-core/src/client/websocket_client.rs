use std::sync::Arc;

use anyhow::Result;
use bytes::Bytes;
use derive_builder::Builder;
use http_body_util::combinators::BoxBody;
use hyper_rustls::{HttpsConnector, HttpsConnectorBuilder};
use hyper_util::{
    client::legacy::{Client, connect::HttpConnector},
    rt::TokioExecutor,
};
use lynx_cert::gen_client_config_by_cert;
use rcgen::Certificate;
use tokio_tungstenite::{
    Connector, WebSocketStream, connect_async_tls_with_config,
    tungstenite::client::IntoClientRequest,
};

#[derive(Builder)]
#[builder(build_fn(skip))]
pub struct WebsocketClient {
    custom_certs: Option<Arc<Vec<Certificate>>>,
    #[builder(setter(skip))]
    connector: Connector,
}

impl WebsocketClient {
    pub async fn request<R>(
        &self,
        req: R,
    ) -> Result<(
        WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>>,
        http::Response<Option<Vec<u8>>>,
    )>
    where
        R: IntoClientRequest + Unpin,
    {
        let websocket_stream =
            connect_async_tls_with_config(req, None, false, Some(self.connector.clone())).await?;

        Ok(websocket_stream)
    }
}

impl WebsocketClientBuilder {
    pub fn build(&self) -> Result<WebsocketClient> {
        let cert_chain = self.custom_certs.clone().flatten();

        let client_config = gen_client_config_by_cert(cert_chain.clone())?;

        let connector = Connector::Rustls(Arc::new(client_config));

        Ok(WebsocketClient {
            connector,
            custom_certs: cert_chain,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::{SinkExt, StreamExt};

    #[tokio::test]
    async fn websocket_test() -> Result<()> {
        let client = WebsocketClientBuilder::default()
            .custom_certs(None)
            .build()?;
        let (stream, _) = client.request("wss://echo.websocket.org/").await?;
        let (mut sink, mut stream) = stream.split();

        sink.send(tokio_tungstenite::tungstenite::Message::Text(
            "Hello, World!".into(),
        ))
        .await?;
        sink.close().await?;

        let data: Vec<_> = stream.collect().await;

        assert!(data.len() > 1);

        Ok(())
    }
}
