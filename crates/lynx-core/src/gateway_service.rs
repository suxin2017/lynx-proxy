use std::{convert::Infallible, task::Poll};

use anyhow::Result;
use http::{Request, Response, StatusCode};
use tower::{
    BoxError, MakeService, Service, service_fn,
    steer::Steer,
    util::{BoxCloneService, BoxService},
};

use crate::{
    common::{HyperReq, HyperReqExt, Res},
    proxy::{
        proxy_connect_request::{is_connect_req, proxy_connect_request},
        proxy_http_request::proxy_http_request,
    },
    utils::{empty, full},
};

struct GatewayService {
    // Fields and methods for the GatewayService
}

type BoxProxyService = BoxService<HyperReq, Res, anyhow::Error>;

pub fn connect_proxy_service_fn() -> BoxProxyService {
    BoxService::new(service_fn(proxy_connect_request))
}

pub async fn gateway_service_fn(req: HyperReq) -> Result<Res> {
    if is_connect_req(&req) {
        return proxy_connect_request(req).await;
    }
    return proxy_http_request(req).await;
    // Ok(Response::new(empty()))
}
