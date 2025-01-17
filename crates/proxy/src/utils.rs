
use anyhow::{anyhow, Error};
use http_body_util::combinators::BoxBody;
use http_body_util::{BodyExt, Empty, Full};
use hyper::body::Bytes;

pub fn host_addr(uri: &http::Uri) -> Option<String> {
    uri.authority().map(|auth| auth.to_string())
}

pub fn empty() -> BoxBody<Bytes, Error> {
    Empty::<Bytes>::new()
        .map_err(|never| anyhow!(never))
        .boxed()
}

pub fn full<T: Into<Bytes>>(chunk: T) -> BoxBody<Bytes, Error> {
    Full::new(chunk.into())
        .map_err(|never| anyhow!(never))
        .boxed()
}

pub fn is_http(uri: &http::Uri) -> bool {
    uri.scheme_str().map(|s| s == "http").unwrap_or(false)
}

pub fn is_https(uri: &http::Uri) -> bool {
    matches!(uri.port_u16(), Some(443))
}
