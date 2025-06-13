use std::sync::Arc;

use anyhow::{Ok, Result, anyhow};
use axum::{body::Body, extract::Request, response::Response};
use http::Method;
use http_body_util::BodyExt;
use hyper_util::{
    rt::{TokioExecutor, TokioIo},
    service::TowerToHyperService,
};
use lynx_db::dao::https_capture_dao::HttpsCaptureDao;
use tokio::spawn;
use tokio_rustls::TlsAcceptor;
use tower::{ServiceBuilder, service_fn, util::Oneshot};
use tracing::{Instrument, instrument};

use crate::{
    common::{HyperReq, Req},
    gateway_service::proxy_gateway_service_fn,
    layers::{
        connect_req_patch_layer::service::ConnectReqPatchLayer,
        error_handle_layer::ErrorHandlerLayer,
        extend_extension_layer::{DbExtensionsExt, ExtendExtensionsLayer, clone_extensions},
        log_layer::LogLayer,
        message_package_layer::{MessageEventLayerExt, RequestMessageEventService},
        request_processing_layer::RequestProcessingService,
        trace_id_layer::{TraceIdLayer, service::TraceIdExt},
    },
    proxy::proxy_ws_request::proxy_ws_request,
    proxy_server::server_ca_manage::ServerCaManagerExtensionsExt,
};

use super::{
    connect_upgraded::{ConnectStreamType, ConnectUpgraded},
    tunnel_proxy_by_stream::tunnel_proxy_by_stream,
};

pub fn is_connect_req<Body>(req: &Request<Body>) -> bool {
    req.method() == Method::CONNECT
}

#[instrument(skip_all)]
async fn proxy_connect_request_future(req: Req) -> Result<()> {
    let db = req.extensions().get_db();
    let event_cannel = req.extensions().get_message_event_cannel();
    let trace_id = req.extensions().get_trace_id();

    let new_extension = clone_extensions(req.extensions())?;

    let uri = req.uri().clone();
    let authority: http::uri::Authority = uri
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
                .layer_fn(|inner| RequestMessageEventService { service: inner })
                .layer_fn(RequestProcessingService::new)
                .service(svc);
            let transform_svc = service_fn(move |req: HyperReq| {
                let svc = svc.clone();
                async move {
                    let req = req.map(|b| b.map_err(|e| anyhow!(e)).boxed());
                    Oneshot::new(svc, req).await
                }
            });
            let svc = TowerToHyperService::new(transform_svc);
            hyper_util::server::conn::auto::Builder::new(TokioExecutor::new())
                .serve_connection_with_upgrades(TokioIo::new(upgraded), svc)
                .await
                .map_err(|e| anyhow!(e))?;
        }
        ConnectStreamType::Https => {
            tracing::trace!(
                "Handling HTTPS connect request for authority: {}",
                authority
            );
            if !should_capture_https(db, &authority)
                .await
                .map_err(|e| anyhow!(e).context("Failed to check if should capture https"))?
            {
                tunnel_proxy_by_stream(upgraded, target_addr, trace_id, event_cannel).await?;
                return Ok(());
            }

            let server_config = server_ca_manage
                .get_server_config(&authority)
                .await
                .map_err(|e| anyhow!(e).context("Failed to get server config"))?;
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
                .layer_fn(|inner| RequestMessageEventService { service: inner })
                .service(svc);

            let transform_svc = service_fn(move |req: HyperReq| {
                let svc = svc.clone();
                async move {
                    let req = req.map(|b| b.map_err(|e| anyhow!(e)).boxed());
                    Oneshot::new(svc, req).await
                }
            });
            let svc = TowerToHyperService::new(transform_svc);

            hyper_util::server::conn::auto::Builder::new(TokioExecutor::new())
                .serve_connection_with_upgrades(TokioIo::new(tls_stream), svc)
                .await
                .map_err(|e| anyhow!(e))?;
        }
        ConnectStreamType::Other => {
            tunnel_proxy_by_stream(upgraded, target_addr, trace_id, event_cannel).await?;
        }
    }
    Ok(())
}

/// # Description
/// This function determines if HTTPS traffic for a given authority should be captured
/// based on the domain and port filtering rules defined in the database.
///
/// # Arguments
/// * `db` - Database connection for retrieving filter configuration
/// * `authority` - The HTTP authority (host:port) to check against filter rules
///
/// # Returns
/// * `Ok(true)` - If the authority matches include rules and not excluded
/// * `Ok(false)` - If HTTPS capture is disabled or authority is excluded/not included
/// * `Err(_)` - If there is an error retrieving filter configuration
pub async fn should_capture_https(
    db: Arc<sea_orm::DatabaseConnection>,
    authority: &http::uri::Authority,
) -> Result<bool> {
    use glob_match::glob_match;
    let host = authority.host();
    let port = authority.port_u16().unwrap_or(443);
    let filter = HttpsCaptureDao::new(db)
        .get_capture_filter()
        .await
        .map_err(|e| anyhow!(e).context("Failed to get capture filter"))?;
    if !filter.enabled {
        return Ok(false);
    }
    if !filter.include_domains.is_empty() {
        let matched = filter.include_domains.iter().any(|item| {
            item.enabled && glob_match(&item.domain, host) && (item.port == 0 || item.port == port)
        });
        return Ok(matched);
    }
    if filter.exclude_domains.iter().any(|item| {
        item.enabled && glob_match(&item.domain, host) && (item.port == 0 || item.port == port)
    }) {
        return Ok(false);
    }
    Ok(true)
}

#[instrument(skip_all)]
pub async fn proxy_connect_request(req: Req) -> Result<Response> {
    assert_eq!(req.method(), Method::CONNECT);

    let span = tracing::Span::current();

    spawn(
        async move {
            if let Err(e) = proxy_connect_request_future(req).await {
                tracing::error!("Failed to handle connect request: {:?}", e);
            };
        }
        .instrument(span),
    );

    Ok(Response::new(Body::empty()))
}
