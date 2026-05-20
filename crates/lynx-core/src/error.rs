use anyhow::Error as AnyError;
use axum::{Json, response::{IntoResponse, Response}};
use http::StatusCode;
use serde::Serialize;

pub type CoreResult<T> = Result<T, CoreError>;

#[derive(Debug, thiserror::Error)]
pub enum CoreError {
    #[error("validation error: {message}")]
    Validation { message: String },
    #[error("not found: {message}")]
    NotFound { message: String },
    #[error("unauthorized: {message}")]
    Unauthorized { message: String },
    #[error("forbidden: {message}")]
    Forbidden { message: String },
    #[error("conflict: {message}")]
    Conflict { message: String },
    #[error("timeout: {operation}")]
    Timeout {
        operation: &'static str,
        #[source]
        source: AnyError,
    },
    #[error("network error: {operation}")]
    Network {
        operation: &'static str,
        #[source]
        source: AnyError,
    },
    #[error("tls error: {operation}")]
    Tls {
        operation: &'static str,
        #[source]
        source: AnyError,
    },
    #[error("database error: {operation}")]
    Db {
        operation: &'static str,
        #[source]
        source: AnyError,
    },
    #[error("io error: {operation}")]
    Io {
        operation: &'static str,
        #[source]
        source: AnyError,
    },
    #[error("missing extension: {name}")]
    MissingExtension { name: &'static str },
    #[error("internal error: {operation}")]
    Internal {
        operation: &'static str,
        #[source]
        source: AnyError,
    },
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ErrorResponse {
    pub code: u16,
    pub category: &'static str,
    pub message: String,
}

impl CoreError {
    pub fn status_code(&self) -> StatusCode {
        match self {
            CoreError::Validation { .. } => StatusCode::BAD_REQUEST,
            CoreError::Unauthorized { .. } => StatusCode::UNAUTHORIZED,
            CoreError::Forbidden { .. } => StatusCode::FORBIDDEN,
            CoreError::NotFound { .. } => StatusCode::NOT_FOUND,
            CoreError::Conflict { .. } => StatusCode::CONFLICT,
            CoreError::Timeout { .. } => StatusCode::REQUEST_TIMEOUT,
            CoreError::Network { .. } | CoreError::Tls { .. } => StatusCode::BAD_GATEWAY,
            CoreError::Db { .. } => StatusCode::SERVICE_UNAVAILABLE,
            CoreError::Io { .. }
            | CoreError::MissingExtension { .. }
            | CoreError::Internal { .. } => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    pub fn category(&self) -> &'static str {
        match self {
            CoreError::Validation { .. } => "validation",
            CoreError::Unauthorized { .. } => "unauthorized",
            CoreError::Forbidden { .. } => "forbidden",
            CoreError::NotFound { .. } => "not_found",
            CoreError::Conflict { .. } => "conflict",
            CoreError::Timeout { .. } => "timeout",
            CoreError::Network { .. } => "network",
            CoreError::Tls { .. } => "tls",
            CoreError::Db { .. } => "database",
            CoreError::Io { .. } => "io",
            CoreError::MissingExtension { .. } => "missing_extension",
            CoreError::Internal { .. } => "internal",
        }
    }

    pub fn public_message(&self) -> String {
        match self {
            CoreError::Validation { message }
            | CoreError::NotFound { message }
            | CoreError::Unauthorized { message }
            | CoreError::Forbidden { message }
            | CoreError::Conflict { message } => message.clone(),
            CoreError::MissingExtension { name } => {
                format!("required request extension is missing: {name}")
            }
            CoreError::Timeout { .. }
            | CoreError::Network { .. }
            | CoreError::Tls { .. }
            | CoreError::Db { .. }
            | CoreError::Io { .. }
            | CoreError::Internal { .. } => "internal server error".to_string(),
        }
    }

    pub fn to_response(&self) -> ErrorResponse {
        ErrorResponse {
            code: self.status_code().as_u16(),
            category: self.category(),
            message: self.public_message(),
        }
    }
}

impl From<AnyError> for CoreError {
    fn from(source: AnyError) -> Self {
        CoreError::Internal {
            operation: "request handling",
            source,
        }
    }
}

impl From<http::Error> for CoreError {
    fn from(source: http::Error) -> Self {
        CoreError::Internal {
            operation: "http operation",
            source: anyhow::anyhow!(source),
        }
    }
}

impl From<http::status::InvalidStatusCode> for CoreError {
    fn from(source: http::status::InvalidStatusCode) -> Self {
        CoreError::Validation {
            message: format!("invalid status code: {source}"),
        }
    }
}

impl From<http::uri::InvalidUri> for CoreError {
    fn from(source: http::uri::InvalidUri) -> Self {
        CoreError::Validation {
            message: format!("invalid uri: {source}"),
        }
    }
}

impl From<http::method::InvalidMethod> for CoreError {
    fn from(source: http::method::InvalidMethod) -> Self {
        CoreError::Validation {
            message: format!("invalid method: {source}"),
        }
    }
}

impl From<std::io::Error> for CoreError {
    fn from(source: std::io::Error) -> Self {
        CoreError::Io {
            operation: "io operation",
            source: anyhow::anyhow!(source),
        }
    }
}

impl From<std::string::FromUtf8Error> for CoreError {
    fn from(source: std::string::FromUtf8Error) -> Self {
        CoreError::Validation {
            message: format!("invalid utf8 body: {source}"),
        }
    }
}

impl IntoResponse for CoreError {
    fn into_response(self) -> Response {
        let error_response = self.to_response();
        let status = StatusCode::from_u16(error_response.code)
            .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        (status, Json(error_response)).into_response()
    }
}
