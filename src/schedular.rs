use std::convert::Infallible;
use std::net::SocketAddr;

use anyhow::Result;
use http::status;
use http_body_util::combinators::BoxBody;
use http_body_util::{BodyExt, Empty, Full};
use hyper::body::{Bytes, Incoming};
use hyper::server::conn::http1;
use hyper::service::service_fn;
use hyper::upgrade::Upgraded;
use hyper::{upgrade, Method, Request, Response};
use hyper_util::rt::{TokioExecutor, TokioIo};
use tokio::net::{TcpListener, TcpStream};
use tracing::trace;

use crate::http_proxy::HttpProxy;
use crate::https_proxy::{self, HttpsProxy};
use crate::tunnel_proxy::TunnelProxy;
use crate::utils::full;

pub struct Schedular {}

impl Schedular {
    pub async fn dispatch(
        &self,
        req: Request<hyper::body::Incoming>,
    ) -> Result<Response<BoxBody<Bytes, hyper::Error>>> {
        trace!("dispatching request {:?}", req.uri());
        let http_proxy = HttpProxy {};
        if http_proxy.guard(&req).await.is_ok() {
            trace!("proxying http request {:?}", req);
            return http_proxy.proxy(req).await;
        };

        let https_proxy = HttpsProxy {};

        if https_proxy.guard(&req).await.is_ok() {
            trace!("proxying https request {:?}", req);
            return https_proxy.proxy(req).await;
        };

        let tunnel_proxy = TunnelProxy {};
        if tunnel_proxy.guard(&req).await.is_ok() {
            trace!("proxying tunnel request {:?}", req);
            return tunnel_proxy.proxy(req).await;
        };

        Ok(Response::builder()
            .status(status::StatusCode::NOT_FOUND)
            .body(full(Bytes::from(
                "The service is not supported by proxy servers",
            )))
            .unwrap())
    }
}
