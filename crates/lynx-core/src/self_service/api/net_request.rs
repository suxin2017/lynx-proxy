use axum::http::StatusCode;
use axum::{Json, extract::State};
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::self_service::RouteState;
use crate::self_service::utils::{EmptyOkResponse, ResponseDataWrapper, empty_ok, ok};
use lynx_db::dao::net_request_dao::{CaptureSwitch, CaptureSwitchDao, RecordingStatus};

#[utoipa::path(
    get,
    path = "/capture/status",
    tags = ["Capture"],
    responses(
        (status = 200, description = "Successfully retrieved capture status", body = ResponseDataWrapper<CaptureSwitch>),
        (status = 500, description = "Failed to get capture status")
    )
)]
async fn get_capture_status(
    State(RouteState { db }): State<RouteState>,
) -> Result<Json<ResponseDataWrapper<CaptureSwitch>>, StatusCode> {
    let dao = CaptureSwitchDao::new(db);
    let status = dao
        .get_capture_switch()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(ok(status)))
}

#[utoipa::path(
    post,
    path = "/capture/toggle",
    tags = ["Capture"],
    responses(
        (status = 200, description = "Capture status changed successfully", body = EmptyOkResponse),
        (status = 500, description = "Failed to change capture status")
    )
)]
async fn toggle_capture(
    State(RouteState { db }): State<RouteState>,
) -> Result<Json<EmptyOkResponse>, StatusCode> {
    let dao = CaptureSwitchDao::new(db.clone());
    let current_status = dao
        .get_capture_switch()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let new_status = match current_status.recording_status {
        RecordingStatus::StartRecording => RecordingStatus::PauseRecording,
        RecordingStatus::PauseRecording => RecordingStatus::StartRecording,
    };

    dao.update_capture_switch(CaptureSwitch {
        recording_status: new_status,
    })
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(empty_ok()))
}

pub fn router(state: RouteState) -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(toggle_capture, get_capture_status))
        .with_state(state)
}
