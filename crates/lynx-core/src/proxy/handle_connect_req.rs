use anyhow::{Ok, Result};
use http::{Request, Response};
use hyper_util::rt::TokioIo;
use tokio::spawn;

use crate::{
    common::{HyperReq, Res},
    layers::trace_id_layer::service::TraceIdExt,
    utils::empty,
};

use super::connect_upgraded::{ConnectStreamType, ConnectUpgraded};

pub fn is_connect_req<Body>(req: &Request<Body>) -> bool {
    req.method() == "CONNECT"
}

pub async fn handle_connect_req<Body>(req: HyperReq) -> Result<Res> {
    let (part, body) = req.into_parts();
    let extensions = part.extensions.clone();

    let req = Request::from_parts(part, body);
    let upgraded = hyper::upgrade::on(req).await?;
    let upgraded = TokioIo::new(upgraded);
    let upgraded = ConnectUpgraded::new(upgraded).await;

    match upgraded.steam_type {
        ConnectStreamType::WebSocket => {
            spawn(async move {
                extensions.get_trace_id();
            });
            // Handle WebSocket connection
            // websocket_proxy(req, upgraded).await?;
        }
        ConnectStreamType::Https => {
            // Handle HTTP connection
            // proxy_http_request(req, upgraded).await?;
        }
        ConnectStreamType::Other => {
            // Handle HTTPS connection
            // https_proxy(req, upgraded).await?;
        }
    }

    Ok(Response::new(empty()))
}
