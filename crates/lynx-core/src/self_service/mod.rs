use std::net::SocketAddr;
use std::sync::Arc;

use crate::common::Req;
use crate::layers::extend_extension_layer::DbExtensionsExt;
use crate::layers::message_package_layer::message_event_store::MessageEventCache;
use crate::layers::message_package_layer::message_event_store::MessageEventStoreExtensionsExt;
use crate::proxy_server::server_config::ProxyServerConfig;
use crate::proxy_server::server_config::ProxyServerConfigExtensionsExt;
use anyhow::Result;
use api::{base_info, net_request};
use axum::Json;
use axum::Router;
use axum::extract::State;
use axum::response::Response;
use http::Method;
use tower::ServiceExt;
use utoipa::ToResponse;
use utoipa::openapi::OpenApi;
use utoipa::openapi::Server;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;
use utoipa_swagger_ui::SwaggerUi;
pub mod api;
pub mod utils;
use tower_http::cors::{Any, CorsLayer};

pub const SELF_SERVICE_PATH_PREFIX: &str = "/__self_service_path__";

pub fn is_self_service(req: &Req) -> bool {
    req.uri().path().starts_with(SELF_SERVICE_PATH_PREFIX)
}

#[utoipa::path(get,  path = "/health", responses((status = OK, body = String)))]
async fn get_health() -> &'static str {
    "ok"
}

#[derive(Clone, Debug)]
pub struct RouteState {
    pub db: Arc<sea_orm::DatabaseConnection>,
    pub net_request_cache: Arc<MessageEventCache>,
    pub proxy_config: Arc<ProxyServerConfig>,
    pub access_addr_list: Arc<Vec<SocketAddr>>,
}

pub async fn self_service_router(req: Req) -> Result<Response> {
    let start_time = std::time::Instant::now();
    let state = RouteState {
        db: req.extensions().get_db(),
        net_request_cache: req.extensions().get_message_event_store(),
        proxy_config: req.extensions().get_proxy_server_config(),
        access_addr_list: req
            .extensions()
            .get::<Arc<Vec<SocketAddr>>>()
            .expect("access_addr_list not found")
            .clone(),
    };
    let cors = CorsLayer::new()
        .allow_methods([Method::GET])
        .allow_origin(Any);

    let (router, mut openapi): (axum::Router, OpenApi) = OpenApiRouter::new()
        .routes(routes!(get_health))
        .layer(cors)
        .with_state(state.clone())
        .nest("/net_request", net_request::router(state.clone()))
        .nest("/certificate", api::certificate::router(state.clone()))
        .nest("/base_info", base_info::router(state.clone()))
        .nest("/https_capture", api::https_capture::router(state.clone()))
        .split_for_parts();

    openapi.servers = Some(vec![Server::new(SELF_SERVICE_PATH_PREFIX)]);
    let swagger_path = format!("{}/swagger-ui", SELF_SERVICE_PATH_PREFIX);
    let api_docs_path = format!("{}/api-docs/openapi.json", SELF_SERVICE_PATH_PREFIX);

    let swagger_router =
        Router::new().merge(SwaggerUi::new(swagger_path).url(api_docs_path, openapi));
    let elapsed_time = start_time.elapsed();
    let router = Router::new().nest(SELF_SERVICE_PATH_PREFIX, router);

    let router = router.merge(swagger_router);
    tracing::info!("Request handled in {:?}", elapsed_time);
    return router
        .oneshot(req)
        .await
        .map_err(|_| anyhow::anyhow!("Error handling request"));
}
