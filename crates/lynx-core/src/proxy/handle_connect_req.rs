use std::mem::take;

use anyhow::{Ok, Result, anyhow};
use http::{Request, Response};
use hyper::service::service_fn;
use hyper_util::{
    rt::{TokioExecutor, TokioIo},
    server::conn::auto,
};
use tokio::spawn;
use tokio_rustls::TlsAcceptor;

use crate::{
    common::{HyperReq, Res},
    layers::trace_id_layer::service::TraceIdExt,
    server_context::{CA_MANAGER, get_ca_manager},
    utils::{empty, full},
};

use super::connect_upgraded::{ConnectStreamType, ConnectUpgraded};

pub fn is_connect_req<Body>(req: &Request<Body>) -> bool {
    req.method() == "CONNECT"
}

pub async fn hello(req: HyperReq) -> Result<Res> {
    Ok(Response::new(full("Hello World!")))
}

pub async fn handle_connect_req<Body>(req: HyperReq) -> Result<Res> {
    let (mut part, body) = req.into_parts();
    let extensions = take(&mut part.extensions);

    let authority = part
        .uri
        .authority()
        .cloned()
        .ok_or_else(|| anyhow::anyhow!("Missing authority in URI"))?;
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
            let ca_manager = get_ca_manager();
            let server_config = ca_manager.get_server_config(&authority).await?;
            let tls_stream = TlsAcceptor::from(server_config).accept(upgraded).await?;

            auto::Builder::new(TokioExecutor::new())
                .serve_connection_with_upgrades(TokioIo::new(tls_stream), service_fn(hello))
                .await
                .map_err(|e| anyhow!(e))?;

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
