use std::sync::Arc;

use crate::common::Req;
use crate::layers::extend_extension_layer::DbExtensionsExt;
use anyhow::Result;
use axum::Json;
use axum::Router;
use axum::extract::State;
use axum::response::Response;
use tower::ServiceExt;
use utoipa::openapi::OpenApi;
use utoipa::openapi::Server;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;
use utoipa_swagger_ui::SwaggerUi; // 添加这一行来获取 oneshot 方法

pub const SELF_SERVICE_PATH_PREFIX: &str = "/__self_service_path__";

pub fn is_self_service(req: &Req) -> bool {
    req.uri().path().starts_with(SELF_SERVICE_PATH_PREFIX)
}

#[derive(utoipa::ToSchema, serde::Serialize)]
struct User {
    id: i32,
}

#[utoipa::path(get,  path = "/user", responses((status = OK, body = User)))]
async fn get_user(State(state): State<RouteState>) -> Json<User> {
    println!("get_user called {:?}", state);
    Json(User { id: 1 })
}

#[derive(Clone, Debug)]
pub struct RouteState {
    pub db: Arc<sea_orm::DatabaseConnection>,
}

pub async fn self_service_router(req: Req) -> Result<Response> {
    let start_time = std::time::Instant::now();
    let state = RouteState {
        db: req.extensions().get_db(),
    };

    let (router, mut openapi): (axum::Router, OpenApi) = OpenApiRouter::new()
        .routes(routes!(get_user))
        .with_state(state)
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
