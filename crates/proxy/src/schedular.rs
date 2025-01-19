use std::sync::Arc;
use std::time::Duration;

use anyhow::{Error, Result};
use http::status;
use http_body_util::combinators::BoxBody;
use hyper::body::Bytes;
use hyper::{Method, Request, Response};
use sea_orm::EntityTrait;
use tokio::sync::broadcast;
use tokio::time::interval;
use tracing::{debug, trace};

use crate::config::AppConfig;
use crate::entities::app_config;
use crate::proxy::http_proxy::HttpProxy;
use crate::proxy::https_proxy::HttpsProxy;
use crate::proxy::websocket_proxy::WebsocketProxy;
use crate::self_service::{handle_self_service, match_self_service};
use crate::server_context::ServerContext;
use crate::tunnel_proxy::TunnelProxy;
use crate::utils::{full, is_http};

pub async fn dispatch(
    proxy_senders: Arc<broadcast::Sender<String>>,
    proxy_receivers: Arc<broadcast::Receiver<String>>,
    ctx: Arc<ServerContext>,
    req: Request<hyper::body::Incoming>,
) -> Result<Response<BoxBody<Bytes, Error>>> {
    if match_self_service(&req) {
        return handle_self_service(proxy_receivers, ctx, req).await;
    }

    tokio::spawn(async move {
        let mut interval = interval(Duration::from_millis(200));
        let mut count = 0;
        loop {
            interval.tick().await;
            if proxy_senders.send("pong\n".to_owned()).is_err() {
                break;
            }
            if count > 5 {
                break;
            }
            count += 1;
        }
    });

    debug!("dispatching request {:?}", req);

    if is_http(req.uri()) {
        trace!("proxying http request {:?}", req);
        return HttpProxy {}.proxy(req).await;
    }

    let config = app_config::Entity::find().one(&ctx.db).await?;
    debug!("app config: {:?}", config);

    if matches!(config.and_then(|c| Some(c.capture_https)), Some(true)) {
        let is_websocket = hyper_tungstenite::is_upgrade_request(&req);
        if is_websocket {
            return WebsocketProxy {}.proxy(req).await;
        }

        if req.method() == Method::CONNECT {
            return HttpsProxy {}.proxy(req).await;
        }
    } else {
        return TunnelProxy {}.proxy(req).await;
    }

    Ok(Response::builder()
        .status(status::StatusCode::NOT_FOUND)
        .body(full(Bytes::from(
            "The service does not support the current protocol",
        )))
        .unwrap())
}
