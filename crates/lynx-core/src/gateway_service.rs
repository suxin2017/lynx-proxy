use std::{convert::Infallible, task::Poll};

use http::{Request, Response, StatusCode};
use tower::{BoxError, MakeService, Service, service_fn, steer::Steer, util::BoxService};

use crate::{
    common::{HyperReq, Res},
    proxy::proxy_connect_request::proxy_connect_request,
    utils::full,
};

struct GatewayService {
    // Fields and methods for the GatewayService
}

type BoxProxyService = BoxService<HyperReq, Res, anyhow::Error>;

pub fn connect_proxy_service_fn() -> BoxProxyService {
    BoxService::new(service_fn(proxy_connect_request))
}

pub fn gateway_service_fn() {
    let connect_proxy_service = connect_proxy_service_fn();

    Steer::<BoxProxyService, _, HyperReq>::new(
        // All services we route between
        vec![connect_proxy_service],
        // How we pick which service to send the request to
        |req: &HyperReq, services: &[BoxProxyService]| {
            // if is_connect_req(req) {
            //     // If the request is a CONNECT request, route to the connect_proxy_service
            //     0
            // }
            0
        },
    );
}
