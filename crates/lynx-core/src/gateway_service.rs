use anyhow::Result;
use axum::response::Response;
 // 添加这一行来获取 oneshot 方法

use crate::self_service::self_service_router;
use crate::{
    common::HyperReq,
    proxy::{
        proxy_connect_request::{is_connect_req, proxy_connect_request},
        proxy_http_request::{is_http_req, proxy_http_request},
        proxy_tunnel_request::proxy_tunnel_proxy,
        proxy_ws_request::{is_websocket_req, proxy_ws_request},
    },
    self_service::is_self_service,
};

pub async fn gatetway_proxy_service_fn(req: HyperReq) -> Result<Response> {
    if is_websocket_req(&req) {
        return proxy_ws_request(req).await;
    }
    if is_http_req(&req) {
        return proxy_http_request(req).await;
    }
    return proxy_tunnel_proxy(req).await;
}

pub async fn gateway_service_fn(req: HyperReq) -> Result<Response> {
    if is_self_service(&req) {
        return self_service_router(req).await;
    }
    if is_connect_req(&req) {
        return proxy_connect_request(req).await;
    }
    gatetway_proxy_service_fn(req).await
}
