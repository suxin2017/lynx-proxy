use axum::{Json, extract::State};
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::error::{CoreError, ErrorResponse};
use crate::layers::message_package_layer::message_event_store::MessageEventStoreValue;
use crate::self_service::RouteState;
use crate::self_service::utils::{EmptyOkResponse, ResponseDataWrapper, empty_ok, ok};
use lynx_storage::dao::net_request_dao::{CaptureSwitch, CaptureSwitchDao, RecordingStatus};

use super::{net_request_service, net_request_sse, net_request_ws};

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
    State(RouteState { store, .. }): State<RouteState>,
) -> Result<Json<ResponseDataWrapper<CaptureSwitch>>, CoreError> {
    let dao = CaptureSwitchDao::new(store);
    let status = dao
        .get_capture_switch()
        .await
        .map_err(|e| CoreError::Db {
            operation: "get capture switch",
            source: anyhow::anyhow!(e),
        })?;
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
    State(RouteState { store, .. }): State<RouteState>,
) -> Result<Json<EmptyOkResponse>, CoreError> {
    let dao = CaptureSwitchDao::new(store.clone());
    let current_status = dao
        .get_capture_switch()
        .await
        .map_err(|e| CoreError::Db {
            operation: "toggle capture switch",
            source: anyhow::anyhow!(e),
        })?;

    Ok(Json(empty_ok()))
}

#[derive(ToSchema, serde::Deserialize, serde::Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct RecordRequests {
    pub new_requests: Vec<MessageEventStoreValue>,
    pub patch_requests: Option<Vec<MessageEventStoreValue>>,
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
    State(state): State<RouteState>,
    Json(params): Json<GetRequestsData>,
) -> Result<Json<ResponseDataWrapper<RecordRequests>>, CoreError> {
    let new_requests = net_request_service::get_cached_requests(&state, Vec::new())
        .await
        .map_err(|e| {
        tracing::error!("Failed to get new requests: {:?}", e);
        CoreError::Db {
            operation: "get new requests",
            source: anyhow::anyhow!(e),
        }
    })?;
    let patch_requests = net_request_service::get_cached_requests(
        &state,
        params.trace_ids.unwrap_or_default(),
    )
        .await
        .map_err(|e| {
            tracing::error!("Failed to get patch requests: {:?}", e);
            CoreError::Db {
                operation: "get requests by keys",
                source: anyhow::anyhow!(e),
            }
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
        .merge(net_request_sse::create_net_request_sse_routes())
    .merge(net_request_ws::create_net_request_ws_routes())
        .with_state(state)
}


