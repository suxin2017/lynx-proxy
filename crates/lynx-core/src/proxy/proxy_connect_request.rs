use anyhow::{Ok, Result, anyhow};
use axum::{body::Body, extract::Request, response::Response};
use http::Method;
use hyper_util::{
    rt::{TokioExecutor, TokioIo},
    service::TowerToHyperService,
};
use tokio::spawn;
use tokio_rustls::TlsAcceptor;
use tower::{ServiceBuilder, service_fn};

use crate::{
    common::HyperReq,
    gateway_service::proxy_gateway_service_fn,
    layers::{
        connect_req_patch_layer::service::ConnectReqPatchLayer,
        error_handle_layer::ErrorHandlerLayer,
        extend_extension_layer::{ExtendExtensionsLayer, clone_extensions},
        log_layer::LogLayer,
        trace_id_layer::TraceIdLayer,
    },
    proxy::proxy_ws_request::proxy_ws_request,
    proxy_server::server_ca_manage::ServerCaManagerExtensionsExt,
};

use super::{
    connect_upgraded::{ConnectStreamType, ConnectUpgraded},
    proxy_tunnel_request::tunnel_proxy_by_stream,
};

pub fn is_connect_req<Body>(req: &Request<Body>) -> bool {
    req.method() == Method::CONNECT
}

async fn proxy_connect_request_future(req: HyperReq) -> Result<()> {
    let new_extension = clone_extensions(req.extensions())?;

    let uri = req.uri().clone();
    let authority = uri
        .authority()
        .cloned()
        .ok_or_else(|| anyhow::anyhow!("Missing authority in URI"))?;
    let target_addr = uri.to_string();

    let server_ca_manage = req.extensions().get_server_ca_manager();

    let upgraded = hyper::upgrade::on(req)
        .await
        .map_err(|e| anyhow!(e).context("Failed to upgrade connect request"))?;
    let upgraded = TokioIo::new(upgraded);
    let upgraded = ConnectUpgraded::new(upgraded).await;

    let service_builder = ServiceBuilder::new()
        .layer(ErrorHandlerLayer)
        .layer(LogLayer)
        .layer(ExtendExtensionsLayer::new(new_extension))
        .layer(TraceIdLayer);

    match upgraded.steam_type {
        // connect proxy and then upgrade to websocket
        ConnectStreamType::WebSocket => {
            let svc = service_fn(proxy_ws_request);
            let svc = service_builder
                .layer(ConnectReqPatchLayer::new(
                    authority.clone(),
                    http::uri::Scheme::HTTP,
                ))
                .service(svc);
            let svc = TowerToHyperService::new(svc);
            hyper_util::server::conn::auto::Builder::new(TokioExecutor::new())
                .serve_connection_with_upgrades(TokioIo::new(upgraded), svc)
                .await
                .map_err(|e| anyhow!(e))?;
        }
        ConnectStreamType::Https => {
            let server_config = server_ca_manage
                .get_server_config(&authority)
                .await
                .map_err(|e| anyhow!(e).context("Failed to get server config"))?;
            vec![b"h2".to_vec(), b"http/1.1".to_vec(), b"http/1.0".to_vec()];
            let tls_stream = TlsAcceptor::from(server_config)
                .accept(upgraded)
                .await
                .map_err(|e| anyhow!(e).context("Failed to accept TLS connection"))?;

            let svc = service_fn(proxy_gateway_service_fn);

            let svc = service_builder
                .layer(ConnectReqPatchLayer::new(
                    authority.clone(),
                    http::uri::Scheme::HTTPS,
                ))
                .service(svc);
            let svc = TowerToHyperService::new(svc);

            hyper_util::server::conn::auto::Builder::new(TokioExecutor::new())
                .serve_connection_with_upgrades(TokioIo::new(tls_stream), svc)
                .await
                .map_err(|e| anyhow!(e))?;
        }
        ConnectStreamType::Other => {
            tunnel_proxy_by_stream(upgraded, target_addr).await?;
        }
    }
    Ok(())
}

pub async fn proxy_connect_request(req: HyperReq) -> Result<Response> {
    assert_eq!(req.method(), Method::CONNECT);

    spawn(async move {
        if let Err(e) = proxy_connect_request_future(req).await {
            tracing::error!("Failed to handle connect request: {:?}", e);
        };
    });

    Ok(Response::new(Body::empty()))
}
