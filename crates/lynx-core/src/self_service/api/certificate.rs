use axum::extract::Query;
use axum::http::StatusCode;
use axum::{Json, extract::State};
use serde::{Deserialize, Serialize};
use tracing::info;
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::layers::message_package_layer::message_event_data::{
    MessageEventRequest, MessageEventResponse,
};
use crate::layers::message_package_layer::message_event_store::{
    MessageEventStatus, MessageEventStoreValue, MessageEventTimings,
};
use crate::self_service::RouteState;
use crate::self_service::utils::{EmptyOkResponse, ResponseDataWrapper, empty_ok, ok};
use axum::http::header;
use axum::response::IntoResponse;
use lynx_db::dao::net_request_dao::{CaptureSwitch, CaptureSwitchDao, RecordingStatus};
use tokio::fs::File;
use tokio::io::AsyncReadExt;

#[utoipa::path(
    get,
    path = "/path",
    tags = ["Certificate"],
    responses(
        (status = 200, description = "Successfully retrieved certificate file path", body = ResponseDataWrapper<String>),
        (status = 500, description = "Failed to get certificate path")
    )
)]
async fn get_cert_path(
    State(state): State<RouteState>,
) -> Result<Json<ResponseDataWrapper<String>>, StatusCode> {
    Ok(Json(ok(state
        .proxy_config
        .root_cert_file_path
        .to_string_lossy()
        .to_string())))
}

#[utoipa::path(
    get,
    path = "/download",
    tags = ["Certificate"],
    responses(
        (status = 200, description = "Successfully downloaded root certificate file", content_type = "application/x-x509-ca-cert"),
        (status = 404, description = "Root certificate file not found"),
        (status = 500, description = "Failed to read root certificate file")
    )
)]
async fn download_certificate(
    State(state): State<RouteState>,
) -> Result<impl IntoResponse, StatusCode> {
    let cert_path = &state.proxy_config.root_cert_file_path;

    // Try to open and read the certificate file
    let mut file = File::open(&cert_path)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;

    let mut contents = Vec::new();
    file.read_to_end(&mut contents)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Create the response with appropriate headers
    let headers = [
        (header::CONTENT_TYPE, "application/x-x509-ca-cert"),
        (
            header::CONTENT_DISPOSITION,
            "attachment; filename=\"certificate.crt\"",
        ),
    ];

    Ok((headers, contents))
}

pub fn router(state: RouteState) -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(get_cert_path))
        .routes(routes!(download_certificate))
        .with_state(state)
}
