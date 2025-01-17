
use anyhow::{Error, Result};
use http::status;
use http_body_util::combinators::BoxBody;
use hyper::body::Bytes;
use hyper::{Method, Request, Response};
use tracing::trace;

use crate::proxy::http_proxy::HttpProxy;
use crate::proxy::https_proxy::HttpsProxy;
use crate::proxy::websocket_proxy::WebsocketProxy;
use crate::utils::{full, is_http};

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

        if is_http(req.uri()) {
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
