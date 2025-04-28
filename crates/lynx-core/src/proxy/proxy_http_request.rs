use anyhow::Result;
use tower::{ServiceBuilder, ServiceExt, service_fn};
use tracing::info;

use crate::{
    client::request_client::RequestClientExt,
    common::{HyperReq, HyperReqExt, HyperResExt, Req, Res},
    layers::build_proxy_request::build_proxy_request,
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

pub async fn proxy_http_request(req: HyperReq) -> Result<Res> {
    let svc = service_fn(proxy_http_request_inner);

    let svc = ServiceBuilder::new().service(svc);

    let proxy_req = build_proxy_request(req.into_box_req())?;
    let res = svc.oneshot(proxy_req).await?;
    Ok(res)
}
