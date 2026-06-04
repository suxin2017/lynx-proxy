use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::get;
use axum::{Router, extract::State};
use tokio::fs::File;
use tokio::io::AsyncReadExt;

use crate::self_service::RouteState;

use axum::http::header;

async fn download_certificate(
    State(state): State<RouteState>,
) -> Result<impl IntoResponse, StatusCode> {
    let cert_path = &state.proxy_config.root_cert_file_path;

    let mut file = File::open(cert_path)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;

    let mut contents = Vec::new();
    file.read_to_end(&mut contents)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let headers = [
        (header::CONTENT_TYPE, "application/x-x509-ca-cert"),
        (
            header::CONTENT_DISPOSITION,
            "attachment; filename=\"certificate.crt\"",
        ),
    ];

    Ok((headers, contents))
}

pub fn router() -> Router<RouteState> {
    Router::new().route("/download", get(download_certificate))
}
