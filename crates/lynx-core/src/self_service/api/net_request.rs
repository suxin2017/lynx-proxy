use axum::http::StatusCode;
use axum::{Json, extract::State};
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::layers::message_package_layer::message_event_store::MessageEventStoreValue;
use crate::self_service::RouteState;
use crate::self_service::utils::{
    AppError, EmptyOkResponse, ErrorResponse, ResponseDataWrapper, empty_ok, ok,
};
use lynx_db::dao::net_request_dao::{CaptureSwitch, CaptureSwitchDao, RecordingStatus};

#[utoipa::path(
    get,
    path = "/capture/status",
    tags = ["Net Request"],
    responses(
        (status = 200, description = "Successfully retrieved capture status", body = ResponseDataWrapper<CaptureSwitch>),
        (status = 500, description = "Failed to get capture status")
    )
)]
async fn get_capture_status(
    State(RouteState { db, .. }): State<RouteState>,
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
    tags = ["Net Request"],
    responses(
        (status = 200, description = "Capture status changed successfully", body = EmptyOkResponse),
        (status = 500, description = "Failed to change capture status")
    )
)]
async fn toggle_capture(
    State(RouteState { db, .. }): State<RouteState>,
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

#[derive(ToSchema, serde::Deserialize, serde::Serialize, Default)]
#[serde(rename_all = "camelCase")]
struct RecordRequests {
    new_requests: Vec<MessageEventStoreValue>,
    patch_requests: Option<Vec<MessageEventStoreValue>>,
}

#[derive(ToSchema, serde::Deserialize, Debug, serde::Serialize, IntoParams)]
#[serde(rename_all = "camelCase")]
struct GetRequestsData {
    trace_ids: Option<Vec<String>>,
}

#[utoipa::path(
    post,
    path = "/requests",
    tags = ["Net Request"],
    responses(
        (status = 200, description = "Successfully retrieved cached requests", body = ResponseDataWrapper<RecordRequests>),
        (status = 500, description = "Failed to get cached requests", body = ErrorResponse)
    ),
    request_body = GetRequestsData,
)]
async fn get_cached_requests(
    State(RouteState {
        net_request_cache, ..
    }): State<RouteState>,
    Json(params): Json<GetRequestsData>,
) -> Result<Json<ResponseDataWrapper<RecordRequests>>, AppError> {
    let new_requests = net_request_cache.get_new_requests().await.map_err(|e| {
        tracing::error!("Failed to get new requests: {:?}", e);
        AppError::DatabaseError(e.to_string())
    })?;
    let patch_requests = net_request_cache
        .get_request_by_keys(params.trace_ids.unwrap_or_default())
        .await
        .map_err(|e| {
            tracing::error!("Failed to get patch requests: {:?}", e);
            AppError::DatabaseError(e.to_string())
        })?;
    Ok(Json(ok(RecordRequests {
        new_requests,
        patch_requests: Some(patch_requests),
    })))
}

pub fn router(state: RouteState) -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(toggle_capture, get_capture_status))
        .routes(routes!(get_cached_requests))
        .with_state(state)
}
