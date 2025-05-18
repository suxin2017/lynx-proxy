use crate::self_service::RouteState;
use crate::self_service::utils::{AppError, ErrorResponse, ResponseDataWrapper, ok};
use axum::Json;
use axum::extract::State;
use lynx_db::dao::https_capture_dao::{CaptureFilter, HttpsCaptureDao};
use utoipa::TupleUnit;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

#[utoipa::path(
    get,
    path = "/https-capture/filter",
    tags = ["HTTPS Capture"],
    responses(
        (status = 200, description = "Successfully retrieved HTTPS capture filter", body = ResponseDataWrapper<CaptureFilter>),
        (status = 500, description = "Failed to get HTTPS capture filter",body = ErrorResponse),
    )
)]
async fn get_https_capture_filter(
    State(RouteState { db, .. }): State<RouteState>,
) -> Result<Json<ResponseDataWrapper<CaptureFilter>>, AppError> {
    let dao = HttpsCaptureDao::new(db);
    let filter = dao
        .get_capture_filter()
        .await
        .map_err(|e| AppError::DatabaseError(e.to_string()))?;
    Ok(Json(ok(filter)))
}

#[utoipa::path(
    post,
    path = "/https-capture/filter",
    tags = ["HTTPS Capture"],
    request_body = CaptureFilter,
    responses(
        (status = 200, description = "Successfully updated HTTPS capture filter", body = ResponseDataWrapper<TupleUnit>),
        (status = 500, description = "Failed to update HTTPS capture filter",body = ErrorResponse)
    )
)]
async fn update_https_capture_filter(
    State(RouteState { db, .. }): State<RouteState>,
    Json(filter): Json<CaptureFilter>,
) -> Result<Json<ResponseDataWrapper<()>>, AppError> {
    let dao = HttpsCaptureDao::new(db);
    dao.update_capture_filter(filter)
        .await
        .map_err(|e| AppError::DatabaseError(e.to_string()))?;
    Ok(Json(ok(())))
}

pub fn router(state: RouteState) -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(
            get_https_capture_filter,
            update_https_capture_filter
        ))
        .with_state(state)
}
