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
use lynx_db::dao::net_request_dao::{CaptureSwitch, CaptureSwitchDao, RecordingStatus};

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CertificateStatus {
    installed: bool,
    details: String,
}

#[utoipa::path(
    get,
    path = "/certificate/status",
    tags = ["Certificate"],
    responses(
        (status = 200, description = "Successfully checked certificate status", body = ResponseDataWrapper<CertificateStatus>),
        (status = 500, description = "Failed to check certificate")
    )
)]
async fn check_certificate_status()
-> Result<Json<ResponseDataWrapper<CertificateStatus>>, StatusCode> {
    Ok(Json(ok(CertificateStatus {
        installed: true,
        details: "Certificate is installed".to_string(),
    })))
}

pub fn router(state: RouteState) -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(check_certificate_status))
        .with_state(state)
}
