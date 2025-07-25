use crate::self_service::RouteState;
use crate::self_service::utils::{AppError, ErrorResponse, ResponseDataWrapper, ok};
use axum::Json;
use axum::extract::State;
use lynx_db::dao::general_setting_dao::{GeneralSetting, GeneralSettingDao};
use utoipa::TupleUnit;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

#[utoipa::path(
    get,
    path = "/general-setting",
    tags = ["General Setting"],
    responses(
        (status = 200, description = "Successfully retrieved general setting", body = ResponseDataWrapper<GeneralSetting>),
        (status = 500, description = "Failed to get general setting", body = ErrorResponse),
    )
)]
async fn get_general_setting(
    State(RouteState { db, .. }): State<RouteState>,
) -> Result<Json<ResponseDataWrapper<GeneralSetting>>, AppError> {
    let dao = GeneralSettingDao::new(db);
    let setting = dao
        .get_general_setting()
        .await
        .map_err(|e| AppError::DatabaseError(e.to_string()))?;
    Ok(Json(ok(setting)))
}

#[utoipa::path(
    put,
    path = "/general-setting",
    tags = ["General Setting"],
    request_body = GeneralSetting,
    responses(
        (status = 200, description = "Successfully updated general setting", body = ResponseDataWrapper<TupleUnit>),
        (status = 500, description = "Failed to update general setting", body = ErrorResponse),
    )
)]
async fn update_general_setting(
    State(RouteState { db, .. }): State<RouteState>,
    Json(setting): Json<GeneralSetting>,
) -> Result<Json<ResponseDataWrapper<TupleUnit>>, AppError> {
    let dao = GeneralSettingDao::new(db);
    dao.update_general_setting(setting)
        .await
        .map_err(|e| AppError::DatabaseError(e.to_string()))?;
    Ok(Json(ok(())))
}

pub fn router(state: RouteState) -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(get_general_setting, update_general_setting))
        .with_state(state)
}