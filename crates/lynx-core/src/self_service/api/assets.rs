use crate::self_service::SELF_SERVICE_PATH_PREFIX;
use crate::self_service::utils::not_found;
use crate::server_context::APP_CONFIG;
use crate::utils::full;
use anyhow::{Error, Result};
use bytes::Bytes;
use http::HeaderValue;
use http::header::CONTENT_TYPE;
use http_body_util::combinators::BoxBody;
use hyper::body::Incoming;
use hyper::{Request, Response};
use tracing::trace;

pub async fn handle_ui_assert(req: Request<Incoming>) -> Result<Response<BoxBody<Bytes, Error>>> {
    let path = req.uri().path();
    let app_config = APP_CONFIG.get().unwrap();
    let mut static_path = &path[SELF_SERVICE_PATH_PREFIX.len()..];
    if static_path.starts_with("/") {
        static_path = &static_path[1..];
    }

    if matches!(static_path, "/" | "") {
        static_path = "index.html";
    }

    let content = app_config.assets_ui_root_dir.as_ref().and_then(|dir| {
        trace!("Get file from include_dir: {}", static_path);
        dir.get_file(static_path)
            .map(|file| file.contents())
            .map(Bytes::copy_from_slice)
    });

    let content = match content {
        Some(content) => content,
        None => {
            trace!("Not found: {}", static_path);
            return Ok(not_found());
        }
    };

    let mime_type = mime_guess::from_path(static_path);
    let content_type = mime_type
        .first()
        .and_then(|mime| {
            let mime_str = mime.to_string();
            HeaderValue::from_str(&mime_str).ok()
        })
        .unwrap_or_else(|| HeaderValue::from_static("text/html"));

    let body = full(content);

    let res: Response<BoxBody<Bytes, Error>> = Response::builder()
        .header(CONTENT_TYPE, content_type)
        .body(body)
        .unwrap();
    Ok(res)
}
