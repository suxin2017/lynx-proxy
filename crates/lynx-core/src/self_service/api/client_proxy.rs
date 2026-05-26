use crate::error::{CoreError, ErrorResponse};
use crate::self_service::RouteState;
use crate::self_service::utils::{ResponseDataWrapper, ok};
use axum::Json;
use axum::extract::State;
use lynx_storage::dao::client_proxy_dao::{ClientProxyConfig, ClientProxyDao};
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
    State(RouteState { store, .. }): State<RouteState>,
) -> Result<Json<ResponseDataWrapper<ClientProxyConfig>>, CoreError> {
    let dao = ClientProxyDao::new(store);
    let config = dao
        .get_client_proxy_config()
        .await
        .map_err(|e| CoreError::Db { operation: "get client proxy config", source: anyhow::anyhow!(e) })?;
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
    State(RouteState { store, .. }): State<RouteState>,
    Json(config): Json<ClientProxyConfig>,
) -> Result<Json<ResponseDataWrapper<()>>, CoreError> {
    let dao = ClientProxyDao::new(store);
    dao.update_client_proxy_config(config)
        .await
        .map_err(|e| CoreError::Db { operation: "update client proxy config", source: anyhow::anyhow!(e) })?;
    Ok(Json(ok(())))
}

pub fn router(state: RouteState) -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(get_client_proxy_config, update_client_proxy_config))
        .with_state(state)
}


