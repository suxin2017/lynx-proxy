use crate::self_service::RouteState;
use axum::{Json, extract::State};
use http::StatusCode;
use utoipa_axum::{router::OpenApiRouter, routes};

#[utoipa::path(
    get,
    path = "/address",
    tags = ["System"],
    responses(
        (status = 200, description = "Successfully retrieved base info", body = Vec<String>),
        (status = 500, description = "Failed to get base info")
    )
)]
async fn get_base_info(
    State(RouteState {
        access_addr_list, ..
    }): State<RouteState>,
) -> Result<Json<Vec<String>>, StatusCode> {
    let info = access_addr_list
        .iter()
        .map(|addr| addr.to_string())
        .collect();

    Ok(Json(info))
}

pub fn router(state: RouteState) -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(get_base_info))
        .with_state(state)
}
