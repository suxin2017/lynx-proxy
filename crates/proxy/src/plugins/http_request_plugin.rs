use std::convert::Infallible;
use std::net::SocketAddr;

use anyhow::{anyhow, Result};
use futures_util::{FutureExt, StreamExt};
use http_body_util::combinators::BoxBody;
use http_body_util::{BodyExt, Empty, Full};
use hyper::body::{Bytes, Incoming};
use hyper::server::conn::http1;
use hyper::service::service_fn;
use hyper::upgrade::Upgraded;
use hyper::{upgrade, Method, Request, Response};
use hyper_rustls::HttpsConnectorBuilder;
use hyper_util::client::legacy::connect::HttpConnector;
use hyper_util::client::legacy::Client;
use hyper_util::rt::{TokioExecutor, TokioIo};
use tokio::net::{TcpListener, TcpStream};

use crate::utils::is_https;

pub struct HttpRequestPlugin;

impl HttpRequestPlugin {
    pub async fn build_proxy_request(req: Request<Incoming>) -> Result<Request<Incoming>> {
        let (parts, body) = req.into_parts();

        let mut builder = hyper::Request::builder()
            .uri(parts.uri)
            .method(parts.method);

        for (key, value) in parts.headers.into_iter() {
            if let Some(key) = key {
                builder = builder.header(key, value);
            }
        }

        builder.body(body).map_err(|e| anyhow!(e))
    }

    pub async fn request(&self, req: Request<Incoming>) -> Result<Response<Incoming>> {
        let client_builder = Client::builder(TokioExecutor::new());
        let proxy_req = HttpRequestPlugin::build_proxy_request(req).await?;

        let proxy_res = if is_https(proxy_req.uri()) {
            client_builder
                .build(
                    HttpsConnectorBuilder::new()
                        .with_webpki_roots()
                        .https_only()
                        .enable_all_versions()
                        .build(),
                )
                .request(proxy_req)
                .await
        } else {
            client_builder
                .build(HttpConnector::new())
                .request(proxy_req)
                .await
        };

        return proxy_res.map_err(|e| anyhow!(e));
    }
}
