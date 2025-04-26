use std::{f32::consts::E, mem::take};

use anyhow::{Ok, Result, anyhow};
use http::{Method, Request, Response};
use hyper_util::{
    rt::{TokioExecutor, TokioIo},
    service::TowerToHyperService,
};
use tokio::spawn;
use tokio_rustls::TlsAcceptor;
use tower::{ServiceBuilder, service_fn};
use tracing::debug;

use crate::{
    client::request_client::RequestClientExt,
    common::{HyperReq, Res},
    layers::{
        connect_req_patch_layer::{ConnectReqPatchService, service::ConnectReqPatchLayer},
        log_layer::LogLayer,
        req_extension_layer::RequestExtensionLayer,
        trace_id_layer::{TraceIdLayer, service::TraceIdExt},
    },
    proxy_server::ClientAddrRequestExt,
    server_context::{CA_MANAGER, get_ca_manager},
    utils::{empty, full},
};

use super::{
    connect_upgraded::{ConnectStreamType, ConnectUpgraded},
    proxy_http_request::proxy_http_request,
    proxy_tunnel_request::{self, proxy_tunnel_proxy, tunnel_proxy_by_stream},
};

pub fn is_connect_req<Body>(req: &Request<Body>) -> bool {
    req.method() == Method::CONNECT
}

async fn proxy_connect_request_future(mut req: HyperReq) -> Result<()> {
    let request_client = req
        .extensions()
        .get_request_client()
        .ok_or_else(|| anyhow::anyhow!("Missing request client in request"))?;
    let client_addr = req
        .extensions()
        .get_client_addr()
        .ok_or_else(|| anyhow::anyhow!("Missing client address in request"))?;
    let uri = req.uri().clone();
    let version = req.version();

    let authority = uri
        .authority()
        .cloned()
        .ok_or_else(|| anyhow::anyhow!("Missing authority in URI"))?;
    let target_addr = uri.to_string();
    let upgraded = hyper::upgrade::on(req)
        .await
        .map_err(|e| anyhow!(e).context("Failed to upgrade connect request"))?;
    let upgraded = TokioIo::new(upgraded);
    let upgraded = ConnectUpgraded::new(upgraded).await;

    debug!("stream type: {:?}", upgraded.steam_type);
    match upgraded.steam_type {
        ConnectStreamType::WebSocket => {
            // Handle WebSocket connection
            // websocket_proxy(req, upgraded).await?;
        }
        ConnectStreamType::Https => {
            let ca_manager = get_ca_manager();
            let server_config = ca_manager
                .get_server_config(&authority)
                .await
                .map_err(|e| anyhow!(e).context("Failed to get server config"))?;
            let tls_stream = TlsAcceptor::from(server_config)
                .accept(upgraded)
                .await
                .map_err(|e| anyhow!(e).context("Failed to accept TLS connection"))?;

            let svc = service_fn(proxy_http_request);

            let svc = ServiceBuilder::new()
                .layer(LogLayer {})
                .layer(TraceIdLayer)
                .layer(RequestExtensionLayer::new(request_client))
                .layer(RequestExtensionLayer::new(client_addr))
                .layer(ConnectReqPatchLayer::new(authority, version))
                .service(svc);
            let svc = TowerToHyperService::new(svc);

            debug!("TLS stream");
            hyper_util::server::conn::auto::Builder::new(TokioExecutor::new())
                .serve_connection_with_upgrades(TokioIo::new(tls_stream), svc)
                .await
                .map_err(|e| anyhow!(e))?;
        }
        ConnectStreamType::Other => {
            // tunnel_proxy_by_stream(upgraded, target_addr).await?;
        }
    }
    Ok(())
}

pub async fn proxy_connect_request(req: HyperReq) -> Result<Res> {
    assert_eq!(req.method(), Method::CONNECT);

    spawn(async move {
        if let Err(e) = proxy_connect_request_future(req).await {
            tracing::error!("Failed to handle connect request: {:?}", e);
        };

        println!("Connect request handled");
    });

    Ok(Response::new(empty()))
}
