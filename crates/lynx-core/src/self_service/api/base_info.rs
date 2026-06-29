use crate::error::CoreError;
use crate::self_service::RouteState;
use axum::Router;
use axum::{Json, extract::State, routing::get};

async fn get_base_info(
    State(RouteState {
        access_addr_list, ..
    }): State<RouteState>,
) -> Result<Json<Vec<String>>, CoreError> {
    let info = access_addr_list
        .iter()
        .map(|addr| addr.to_string())
        .collect();

    Ok(Json(info))
}

pub fn router() -> Router<RouteState> {
    Router::new().route("/address", get(get_base_info))
}
