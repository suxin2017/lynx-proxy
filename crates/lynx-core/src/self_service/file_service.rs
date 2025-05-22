use axum::extract::State;
use axum::response::IntoResponse;
use http::header::CONTENT_TYPE;
use http::{HeaderMap, Uri};
use mime_guess::from_path;
use tracing::info;

use super::RouteState;

pub async fn get_file(
    file_path: Uri,
    State(RouteState { static_dir, .. }): State<RouteState>,
) -> impl IntoResponse {
    info!("get_file: {:?}", file_path);
    if let Some(static_dir) = static_dir {
        let file_path = file_path.path().trim_start_matches('/');

        let file_path = if file_path.is_empty() {
            "index.html"
        } else {
            file_path
        };

        let res = static_dir.0.get_file(file_path);

        if let Some(res) = res {
            let mime_type = from_path(file_path).first_or_octet_stream();
            let content_type = mime_type.to_string();
            let mut header = HeaderMap::new();
            header.insert(CONTENT_TYPE, content_type.parse().unwrap());
            return (http::StatusCode::OK, header, res.contents());
        }
    }
    let mut header = HeaderMap::new();
    header.insert(CONTENT_TYPE, "text/plain".parse().unwrap());
    (http::StatusCode::OK, header, "not found".as_bytes())
}
