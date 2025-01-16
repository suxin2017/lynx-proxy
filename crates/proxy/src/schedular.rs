use std::convert::Infallible;
use std::net::SocketAddr;

use anyhow::{Error, Result};
use http::header::CONNECTION;
use http::{status, StatusCode};
use http_body_util::combinators::BoxBody;
use http_body_util::{BodyExt, Empty, Full};
use hyper::body::{Bytes, Incoming};
use hyper::server::conn::http1;
use hyper::service::service_fn;
use hyper::upgrade::Upgraded;
use hyper::{upgrade, Method, Request, Response};
use hyper_util::rt::{TokioExecutor, TokioIo};
use tokio::io::AsyncReadExt;
use tokio::net::{TcpListener, TcpStream};
use tracing::trace;

use crate::proxy::http_proxy::HttpProxy;
use crate::proxy::https_proxy::HttpsProxy;
use crate::proxy::websocket_proxy::WebsocketProxy;
use crate::self_service::match_self_service;
use crate::tunnel_proxy::TunnelProxy;
use crate::utils::{empty, full, is_http, is_https};

pub struct Schedular;

impl Schedular {
    pub async fn dispatch(
        &self,
        req: Request<hyper::body::Incoming>,
    ) -> Result<Response<BoxBody<Bytes, Error>>> {
        let is_websocket = hyper_tungstenite::is_upgrade_request(&req);
        if is_websocket {
            return WebsocketProxy {}.proxy(req).await;
        }

        if is_http(&req.uri()) {
            trace!("proxying http request {:?}", req);
            return HttpProxy {}.proxy(req).await;
        }

        if req.method() == Method::CONNECT {
            return HttpsProxy {}.proxy(req).await;
        }

        // TunnelProxy {}.proxy(req).await;

        Ok(Response::builder()
            .status(status::StatusCode::NOT_FOUND)
            .body(full(Bytes::from(
                "The service does not support the current protocol",
            )))
            .unwrap())
    }
}
