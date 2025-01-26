use core::fmt;

use anyhow::{anyhow, Error, Result};
use bytes::{Buf, Bytes};
use http::header::CONTENT_TYPE;
use http_body_util::combinators::BoxBody;
use http_body_util::BodyExt;
use hyper::body::Incoming;
use hyper::Response;

use crate::utils::full;

pub async fn get_body_json<Value>(body: Incoming) -> Result<Value>
where
    Value: serde::de::DeserializeOwned,
{
    let body = body
        .collect()
        .await
        .map_err(|e| anyhow!(e).context("collect body error"))?;
    let aggregate = body.aggregate();
    let json_value: Value = serde_json::from_reader(aggregate.reader())
        .map_err(|e| anyhow!(e).context("parse request body json error"))?;
    Ok(json_value)
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct ResponseBox<T> {
    pub code: ResponseCode,
    pub message: Option<String>,
    pub data: Option<T>,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub enum ResponseCode {
    Ok,
    ValidateError,
    OperationError,
    InternalServerError,
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct ValidateError {
    message: String,
}

impl ValidateError {
    pub fn new(message: String) -> Self {
        ValidateError { message }
    }
}

impl fmt::Display for ValidateError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "ValidateError: {}", self.message)
    }
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct OperationError {
    message: String,
}

impl OperationError {
    pub fn new(message: String) -> Self {
        OperationError { message }
    }
}

impl fmt::Display for OperationError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "Operation: {}", self.message)
    }
}

pub fn ok<T>(data: T) -> ResponseBox<T> {
    ResponseBox {
        code: ResponseCode::Ok,
        message: None,
        data: Some(data),
    }
}

pub fn internal_server_error(message: String) -> ResponseBox<Option<()>> {
    ResponseBox {
        code: ResponseCode::InternalServerError,
        message: Some(message),
        data: None,
    }
}

pub fn operation_error(message: String) -> ResponseBox<Option<()>> {
    ResponseBox {
        code: ResponseCode::OperationError,
        message: Some(message),
        data: None,
    }
}

pub fn validate_error<T>(message: String) -> ResponseBox<T> {
    ResponseBox {
        code: ResponseCode::ValidateError,
        message: Some(message),
        data: None,
    }
}

pub fn response_ok<T>(data: T) -> Result<Response<BoxBody<Bytes, Error>>>
where
    T: serde::Serialize,
{
    let res = ok(data);
    let json_str = serde_json::to_string(&res)?;

    Ok(Response::builder()
        .header(CONTENT_TYPE, "application/json")
        .body(full(Bytes::from(json_str)))?)
}
