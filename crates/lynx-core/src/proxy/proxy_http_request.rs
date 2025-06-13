use anyhow::Result;
use axum::response::{IntoResponse, Response};
use tower::{ServiceBuilder, ServiceExt, service_fn};
use tracing::instrument;

use crate::{
    client::request_client::RequestClientExt,
    common::Req,
    layers::{
        build_proxy_request::BuildProxyRequestService,
        message_package_layer::ProxyMessageEventService,
        request_processing_layer::RequestProcessingService, trace_id_layer::service::TraceIdExt,
    },
};

pub fn is_http_req(req: &Req) -> bool {
    req.headers().get("Upgrade").is_none()
}

async fn proxy_http_request_inner(req: Req) -> Result<Response> {
    let trace_id = req.extensions().get_trace_id().clone();
    let http_client = req.extensions().get_http_client();
    http_client
        .request(req)
        .await
        .map_err(|e| e.context("http request failed"))
        .map(|mut res| {
            res.extensions_mut().insert(trace_id);
            res
        })
        .map(|res| res.into_response())
}

pub async fn proxy_http_request(req: Req) -> Result<Response> {
    let svc = service_fn(proxy_http_request_inner);

    let svc = ServiceBuilder::new()
        .layer_fn(|s| BuildProxyRequestService { service: s })
        .layer_fn(|s| ProxyMessageEventService { service: s })
        .layer_fn(|s| RequestProcessingService { service: s })
        .service(svc);

    let res = svc.oneshot(req).await?;
    Ok(res.into_response())
}
