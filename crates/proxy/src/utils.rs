use std::convert::Infallible;
use std::net::SocketAddr;

use anyhow::Result;
use http::uri;
use http_body_util::combinators::BoxBody;
use http_body_util::{BodyExt, Empty, Full};
use hyper::body::{Bytes, Incoming};
use hyper::server::conn::http1;
use hyper::service::service_fn;
use hyper::upgrade::Upgraded;
use hyper::{upgrade, Method, Request, Response};
use hyper_util::rt::{TokioExecutor, TokioIo};
use tokio::net::{TcpListener, TcpStream};

pub fn host_addr(uri: &http::Uri) -> Option<String> {
    uri.authority().map(|auth| auth.to_string())
}

pub fn empty() -> BoxBody<Bytes, hyper::Error> {
    Empty::<Bytes>::new()
        .map_err(|never| match never {})
        .boxed()
}

pub fn full<T: Into<Bytes>>(chunk: T) -> BoxBody<Bytes, hyper::Error> {
    Full::new(chunk.into())
        .map_err(|never| match never {})
        .boxed()
}

pub fn is_http(uri: &http::Uri) -> bool {
    uri.scheme_str().map(|s| s == "http").unwrap_or(false)
}

pub fn is_https(uri: &http::Uri) -> bool {
    uri.port_u16().and_then(|p| Some(p == 443)).is_some()
}
