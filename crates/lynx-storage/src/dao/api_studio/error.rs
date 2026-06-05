use thiserror::Error;

#[derive(Debug, Error)]
pub enum ApiStudioError {
    #[error("validation: {0}")]
    Validation(String),
    #[error("not found: {0}")]
    NotFound(String),
    #[error("conflict: {0}")]
    Conflict(String),
    #[error(transparent)]
    Storage(#[from] anyhow::Error),
}

pub fn storage<E: Into<anyhow::Error>>(err: E) -> ApiStudioError {
    ApiStudioError::Storage(err.into())
}
