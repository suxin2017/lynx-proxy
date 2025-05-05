use anyhow::Result;
use axum::response::{IntoResponse, Response};
use tower::{ServiceBuilder, ServiceExt, service_fn};
use tracing::info;

use crate::{
    client::request_client::RequestClientExt,
    common::{HyperReq, HyperReqExt, HyperResExt, Req, Res},
    layers::build_proxy_request::BuildProxyRequestService,
};

pub fn is_http_req(req: &HyperReq) -> bool {
    req.headers().get("Upgrade").is_none()
}

async fn proxy_http_request_inner(req: Req) -> Result<Res> {
    info!("req {:#?}", req);
    let http_client = req.extensions().get_http_client();
    http_client
        .request(req)
        .await
        .map_err(|e| e.context("http request failed"))
        .map(|res| res.into_box_res())
}

pub async fn proxy_http_request(req: HyperReq) -> Result<Response> {
    let svc = service_fn(proxy_http_request_inner);

    let svc = ServiceBuilder::new()
        .layer_fn(|s| BuildProxyRequestService { service: s })
        .service(svc);

    let res = svc.oneshot(req.into_box_req()).await?;
    Ok(res.into_response())
}
