use crate::self_service::utils::parse_query_params;
use crate::server_context::APP_CONFIG;
use crate::utils::full;
use anyhow::{Error, Result};
use bytes::Bytes;
use http::header::{CONTENT_DISPOSITION, CONTENT_TYPE};
use http_body_util::combinators::BoxBody;
use hyper::body::Incoming;
use hyper::{Request, Response};

pub async fn handle_certificate(req: Request<Incoming>) -> Result<Response<BoxBody<Bytes, Error>>> {
    let query_params = parse_query_params(req.uri());
    let ca_path = APP_CONFIG.get().unwrap().get_root_ca_path();

    let ca_content = tokio::fs::read(ca_path).await?;

    let ca_type = query_params
        .get("type")
        .map(|s| s.as_str())
        .unwrap_or("pem");

    let res = Response::builder();

    let res = match ca_type {
        "pem" => res.header(CONTENT_TYPE, "application/x-pem-file"),
        "crt" => res.header(CONTENT_TYPE, "application/x-x509-ca-cert"),
        _ => res.header(CONTENT_TYPE, "application/octet-stream"),
    };

    let res = match ca_type {
        "pem" => res.header(
            CONTENT_DISPOSITION,
            "attachment; filename=\"lynx-proxy.pem\"",
        ),
        "crt" => res.header(
            CONTENT_DISPOSITION,
            "attachment; filename=\"lynx-proxy.crt\"",
        ),
        _ => unreachable!(),
    };
    let res = res.body(full(ca_content))?;

    Ok(res)
}
