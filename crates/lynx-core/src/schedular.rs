use std::sync::Arc;

use anyhow::{Error, Result};
use glob_match::glob_match;
use http::header::CONTENT_TYPE;
use http::status;
use http_body_util::combinators::BoxBody;
use hyper::body::{Bytes, Incoming};
use hyper::{Method, Request, Response};
use nanoid::nanoid;
use tracing::{debug, info, trace};

use crate::entities::app_config::{SSLConfigRule, get_app_config, get_enabled_ssl_config};
use crate::proxy::http_proxy::proxy_http_request;
use crate::proxy::https_proxy::https_proxy;
use crate::proxy::websocket_proxy::websocket_proxy;
use crate::self_service::{handle_self_service, match_self_service};
use crate::tunnel_proxy::tunnel_proxy;
use crate::utils::{empty, full, is_http};

pub fn get_req_trace_id(req: &Request<hyper::body::Incoming>) -> Arc<String> {
    req.extensions()
        .get::<Arc<String>>()
        .map(Arc::clone)
        .expect("trace id not found")
}

pub fn get_res_trace_id(res: &Response<hyper::body::Incoming>) -> Arc<String> {
    res.extensions()
        .get::<Arc<String>>()
        .map(Arc::clone)
        .expect("trace id not found")
}

pub async fn capture_ssl(req: &Request<Incoming>) -> Result<bool> {
    let app_config = get_app_config().await;
    if !app_config.capture_ssl {
        return Ok(false);
    }
    let (include, exclude) = get_enabled_ssl_config().await?;

    let uri = req.uri();

    let host = uri.host();
    let port = uri.port_u16();

    let match_host = |config: &SSLConfigRule, host: &str, port: u16| -> bool {
        let glob_match_host = glob_match(&config.host, host);
        trace!(
            "matching host: {:?} {:?} {:?}",
            config.host, host, glob_match_host
        );
        if !glob_match_host {
            return false;
        }
        if matches!(config.port, Some(p) if p != port) {
            return false;
        }
        true
    };

    match (host, port) {
        (Some(host), Some(port)) => {
            let include = include.iter().any(|config| match_host(config, host, port));
            let exclude = exclude.iter().any(|config| match_host(config, host, port));
            trace!("capture ssl: {:?} {:?} {:?}", include, exclude, uri);
            Ok(include && !exclude)
        }
        _ => Ok(false),
    }
}

pub async fn dispatch(
    mut req: Request<hyper::body::Incoming>,
) -> Result<Response<BoxBody<Bytes, Error>>> {
    if match_self_service(&req) {
        return handle_self_service(req).await;
    }

    info!("dispatching request {:?}", req.uri());
    debug!("dispatching request {:?}", req);

    req.extensions_mut().insert(Arc::new(nanoid!()));

    let is_websocket = hyper_tungstenite::is_upgrade_request(&req);
    if is_websocket {
        info!("proxying websocket request {:?}", req);
        return websocket_proxy(req).await;
    }
    if is_http(req.uri()) {
        trace!("proxying http request {:?}", req);
        return proxy_http_request(req).await;
    }

    if capture_ssl(&req).await? {
        trace!("proxying https request {:?}", req);
        if req.method() == Method::CONNECT {
            return https_proxy(req).await;
        }
    } else {
        trace!("tunnel proxy {:?}", req);
        return tunnel_proxy(req).await;
    }

    Response::builder()
        .status(status::StatusCode::NOT_FOUND)
        .header(CONTENT_TYPE, "text/plain")
        .body(full(Bytes::from(
            "The service does not support the current protocol",
        )))
        .map_err(Error::from)
}
