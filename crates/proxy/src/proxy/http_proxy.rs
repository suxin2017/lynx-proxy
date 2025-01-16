use std::convert::Infallible;
use std::net::SocketAddr;

use anyhow::{anyhow, Error, Result};
use futures_util::{FutureExt, StreamExt};
use http_body_util::combinators::BoxBody;
use http_body_util::{BodyExt, Empty, Full};
use hyper::body::{self, Bytes, Incoming};
use hyper::server::conn::http1;
use hyper::service::service_fn;
use hyper::upgrade::Upgraded;
use hyper::{upgrade, Method, Request, Response};
use hyper_rustls::HttpsConnectorBuilder;
use hyper_util::client::legacy::connect::HttpConnector;
use hyper_util::client::legacy::Client;
use hyper_util::rt::{TokioExecutor, TokioIo};
use tokio::net::{TcpListener, TcpStream};
use tracing::{info, trace};

use crate::plugins::http_request_plugin::HttpRequestPlugin;
use crate::utils::{empty, host_addr, is_http, is_https};

pub struct HttpProxy {}

impl HttpProxy {
    pub async fn guard(&self, req: &Request<Incoming>) -> bool {
        return is_http(req.uri());
    }
    pub async fn proxy(&self, req: Request<Incoming>) -> Result<Response<BoxBody<Bytes, Error>>> {
        info!("proxying http request {:?}", req);

        let proxy_res = HttpRequestPlugin {}.request(req).await?;

        trace!("origin response: {:?}", proxy_res);

        let (parts, body) = proxy_res.into_parts();
        let body = body
            .map_err(|e| anyhow!(e).context("http proxy body box error"))
            .boxed();

        let proxy_req = Response::from_parts(parts, body);

        return Ok(proxy_req);
    }
}
