use std::sync::Arc;

use anyhow::Result;
use derive_builder::Builder;
use rcgen::Certificate;

use super::{
    http_client::{HttpClient, HttpClientBuilder},
    websocket_client::{WebsocketClient, WebsocketClientBuilder},
};

#[derive(Builder)]
#[builder(build_fn(skip))]
pub struct RequestClient {
    custom_certs: Option<Arc<Vec<Certificate>>>,
    #[builder(setter(skip))]
    http_client: HttpClient,
    #[builder(setter(skip))]
    websocket_client: WebsocketClient,
}

impl RequestClientBuilder {
    pub fn build(&self) -> Result<RequestClient> {
        let custom_certs = self.custom_certs.clone().flatten();

        let http_client = HttpClientBuilder::default()
            .custom_certs(custom_certs.clone())
            .build()?;
        let websocket_client = WebsocketClientBuilder::default()
            .custom_certs(custom_certs.clone())
            .build()?;

        Ok(RequestClient {
            custom_certs,
            http_client,
            websocket_client,
        })
    }
}

#[cfg(test)]
mod tests {
    use anyhow::Ok;

    use super::*;

    #[test]
    fn build_request_client_test() -> Result<()> {
        let client = RequestClientBuilder::default().custom_certs(None).build();
        assert!(client.is_ok());
        Ok(())
    }
}
