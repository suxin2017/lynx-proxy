use crate::self_service::{
    RouteState,
    utils::{ResponseDataWrapper, ok},
};
use axum::{Json, extract::State};
use http::StatusCode;
use utoipa::ToSchema;
use utoipa_axum::{router::OpenApiRouter, routes};

#[derive(ToSchema, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BaseInfo {
    access_addr_list: Vec<String>,
}

#[utoipa::path(
    get,
    path = "/base_info",
    tags = ["System"],
    responses(
        (status = 200, description = "Successfully retrieved base info", body = ResponseDataWrapper<BaseInfo>),
        (status = 500, description = "Failed to get base info")
    )
)]
async fn get_base_info(
    State(RouteState {
        access_addr_list, ..
    }): State<RouteState>,
) -> Result<Json<ResponseDataWrapper<BaseInfo>>, StatusCode> {
    let info = BaseInfo {
        access_addr_list: access_addr_list
            .iter()
            .map(|addr| addr.to_string())
            .collect(),
    };
    Ok(Json(ok(info)))
}

pub fn router(state: RouteState) -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(get_base_info))
        .with_state(state)
}
