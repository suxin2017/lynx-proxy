use std::sync::Arc;

use anyhow::{Error, Result};
use http::header::CONTENT_TYPE;
use http::status;
use http_body_util::combinators::BoxBody;
use hyper::body::Bytes;
use hyper::{Method, Request, Response};
use nanoid::nanoid;
use sea_orm::EntityTrait;
use tracing::{debug, trace};

use crate::entities::app_config;
use crate::proxy::http_proxy::proxy_http_request;
use crate::proxy::https_proxy::HttpsProxy;
use crate::self_service::{handle_self_service, match_self_service};
use crate::server_context::DB;
use crate::tunnel_proxy::TunnelProxy;
use crate::utils::{full, is_http};

pub fn get_req_trace_id(req: &Request<hyper::body::Incoming>) -> Arc<String> {
    req.extensions()
        .get::<Arc<String>>()
        .map(Arc::clone)
        .expect("trace id not found")
}

pub async fn dispatch(
    mut req: Request<hyper::body::Incoming>,
) -> Result<Response<BoxBody<Bytes, Error>>> {
    if match_self_service(&req) {
        return handle_self_service(req).await;
    }
    debug!("dispatching request {:?}", req);

    req.extensions_mut().insert(Arc::new(nanoid!()));

    if is_http(req.uri()) {
        trace!("proxying http request {:?}", req);
        return proxy_http_request(req).await;
    }

    let config = app_config::Entity::find().one(DB.get().unwrap()).await?;
    debug!("app config: {:?}", config);
    if matches!(config.map(|c| c.capture_https), Some(true)) {
        // TODO: support websocket
        // let is_websocket = hyper_tungstenite::is_upgrade_request(&req);
        // if is_websocket {
        //     return WebsocketProxy {}.proxy(req).await;
        // }

        if req.method() == Method::CONNECT {
            return HttpsProxy {}.proxy(req).await;
        }
    } else {
        return TunnelProxy {}.proxy(req).await;
    }

    Ok(Response::builder()
        .status(status::StatusCode::NOT_FOUND)
        .header(CONTENT_TYPE, "text/plain")
        .body(full(Bytes::from(
            "The service does not support the current protocol",
        )))
        .unwrap())
}
