use axum::extract::Path;
use axum::response::IntoResponse;
use axum::{Router, extract::State};
use http::header::CONTENT_TYPE;
use http::{HeaderMap, Uri};
use include_dir::{Dir, include_dir};
use mime_guess::from_path;
use tracing::info;

use super::RouteState;

pub async fn get_file(
    file_path: Uri,
    State(RouteState { static_dir, .. }): State<RouteState>,
) -> impl IntoResponse {
    info!("Requesting file: {}", file_path);
    if let Some(static_dir) = static_dir {
        let file_path = file_path.path().trim_start_matches('/');
        info!("Static directory: {:?}", static_dir);
        info!("File path: {}", file_path);
        let res = static_dir.0.get_file(&file_path);

        if let Some(res) = res {
            let mime_type = from_path(file_path).first_or_octet_stream();
            let content_type = mime_type.to_string();
            let mut header = HeaderMap::new();
            header.insert(CONTENT_TYPE, content_type.parse().unwrap());
            return (http::StatusCode::OK, header, res.contents());
        }
    }
    return (
        http::StatusCode::OK,
        HeaderMap::new(),
        "not found".as_bytes(),
    );
}
