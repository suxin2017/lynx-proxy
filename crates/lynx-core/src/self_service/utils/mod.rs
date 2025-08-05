use core::fmt;

use axum::{
    Json,
    response::{IntoResponse, Response},
};
use http::StatusCode;
use http::header::{HeaderMap, HeaderName, HeaderValue};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use utoipa::{PartialSchema, ToSchema, TupleUnit};

#[derive(Debug, ToSchema, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ResponseCode {
    Ok,
    ValidateError,
}

#[derive(Debug, ToSchema, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResponseDataWrapper<T: PartialSchema> {
    pub code: ResponseCode,
    pub message: Option<String>,
    pub data: T,
}

pub fn ok<T: ToSchema>(data: T) -> ResponseDataWrapper<T> {
    ResponseDataWrapper {
        code: ResponseCode::Ok,
        message: None,
        data,
    }
}

#[derive(Debug, ToSchema, serde::Deserialize, serde::Serialize)]
pub struct EmptyOkResponse(ResponseDataWrapper<utoipa::TupleUnit>);

pub fn empty_ok() -> EmptyOkResponse {
    EmptyOkResponse(ResponseDataWrapper {
        code: ResponseCode::Ok,
        message: None,
        data: TupleUnit::default(),
    })
}

pub fn validate_error<T: serde::Serialize>(message: String) -> EmptyOkResponse {
    EmptyOkResponse(ResponseDataWrapper {
        code: ResponseCode::ValidateError,
        message: Some(message),
        data: TupleUnit::default(),
    })
}

#[derive(Debug, ToSchema, serde::Deserialize, serde::Serialize)]
pub enum AppError {
    DatabaseError(String),
    ValidationError(String),
    InternalServerError,
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::DatabaseError(msg) => write!(f, "Database error: {}", msg),
            AppError::ValidationError(msg) => write!(f, "Validation error: {}", msg),
            AppError::InternalServerError => write!(f, "Internal server error"),
        }
    }
}

impl std::error::Error for AppError {}
impl AppError {
    pub fn to_response(&self) -> ErrorResponse {
        match self {
            AppError::DatabaseError(msg) => ErrorResponse {
                code: 500,
                message: format!("Database error: {}", msg),
            },
            AppError::ValidationError(msg) => ErrorResponse {
                code: 400,
                message: format!("Validation error: {}", msg),
            },
            AppError::InternalServerError => ErrorResponse {
                code: 500,
                message: "Internal server error".to_string(),
            },
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let error_response = self.to_response();
        let status_code =
            StatusCode::from_u16(error_response.code).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        (status_code, Json(error_response)).into_response()
    }
}

#[derive(Debug, ToSchema, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ErrorResponse {
    pub code: u16,
    pub message: String,
}

pub fn hashmap_to_headermap(
    map: HashMap<String, String>,
) -> Result<HeaderMap, Box<dyn std::error::Error>> {
    let mut headers = HeaderMap::new();

    for (k, v) in map {
        let name = HeaderName::from_bytes(k.as_bytes())?;
        let value = HeaderValue::from_str(&v)?;
        headers.insert(name, value);
    }

    Ok(headers)
}
