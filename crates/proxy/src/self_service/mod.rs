use anyhow::{Error, Result};
use bytes::Bytes;
use http_body_util::combinators::BoxBody;
use hyper::body::Incoming;
use hyper::{Request, Response};

use crate::utils::full;

const SELF_SERVICE_PATH_PREFIX: &str = "__self_service_path__";

pub fn match_self_service(req: &Request<Incoming>) -> bool {
    req.uri().path().starts_with(SELF_SERVICE_PATH_PREFIX)
}

pub async fn handle_self_service(
    req: Request<Incoming>,
) -> Result<Response<BoxBody<Bytes, Error>>> {
    if req.uri().path() == "/hello" {
        return Ok(Response::new(full(Bytes::from("Hello, World!"))));
    }
    let res = Response::builder()
        .status(http::status::StatusCode::NOT_FOUND)
        .body(full(Bytes::from("Not Found")))
        .unwrap();
    Ok(res)
}
