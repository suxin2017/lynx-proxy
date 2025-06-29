use crate::self_service::RouteState;
use crate::self_service::utils::{AppError, ErrorResponse, ResponseDataWrapper, ok};
use axum::Json;
use axum::extract::State;
use lynx_db::dao::client_proxy_dao::{ClientProxyConfig, ClientProxyDao};
use utoipa::TupleUnit;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

#[utoipa::path(
    get,
    path = "/client-proxy/config",
    tags = ["Client Proxy"],
    responses(
        (status = 200, description = "Successfully retrieved client proxy configuration", body = ResponseDataWrapper<ClientProxyConfig>),
        (status = 500, description = "Failed to get client proxy configuration", body = ErrorResponse),
    )
)]
async fn get_client_proxy_config(
    State(RouteState { db, .. }): State<RouteState>,
) -> Result<Json<ResponseDataWrapper<ClientProxyConfig>>, AppError> {
    let dao = ClientProxyDao::new(db);
    let config = dao
        .get_client_proxy_config()
        .await
        .map_err(|e| AppError::DatabaseError(e.to_string()))?;
    Ok(Json(ok(config)))
}

#[utoipa::path(
    post,
    path = "/client-proxy/config",
    tags = ["Client Proxy"],
    request_body = ClientProxyConfig,
    responses(
        (status = 200, description = "Successfully updated client proxy configuration", body = ResponseDataWrapper<TupleUnit>),
        (status = 500, description = "Failed to update client proxy configuration", body = ErrorResponse)
    )
)]
async fn update_client_proxy_config(
    State(RouteState { db, .. }): State<RouteState>,
    Json(config): Json<ClientProxyConfig>,
) -> Result<Json<ResponseDataWrapper<()>>, AppError> {
    let dao = ClientProxyDao::new(db);
    dao.update_client_proxy_config(config)
        .await
        .map_err(|e| AppError::DatabaseError(e.to_string()))?;
    Ok(Json(ok(())))
}

pub fn router(state: RouteState) -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(get_client_proxy_config, update_client_proxy_config))
        .with_state(state)
}
