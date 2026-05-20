use std::{
    fmt::Write,
    task::{Context, Poll, ready},
};

use anyhow::Result;
use axum::response::{IntoResponse, Response};
use http::header::CONTENT_TYPE;
use pin_project_lite::pin_project;
use serde_json::to_string;
use tracing::error;

use crate::error::CoreError;

pin_project! {
    pub struct ErrorHandleFuture<F> {
        #[pin]
        pub f: F,
    }
}

impl<F> Future for ErrorHandleFuture<F>
where
    F: Future<Output = Result<Response>>,
{
    type Output = F::Output;

    fn poll(self: std::pin::Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
        let this = self.project();
        let res = ready!(this.f.poll(cx));

        if let Err(err) = &res {
            let error_reason = format_error_chain(err);
            let core_error = err
                .downcast_ref::<CoreError>()
                .map_or_else(|| CoreError::from(anyhow::anyhow!("{}", error_reason)), clone_core_error);

            error!(
                category = core_error.category(),
                status = core_error.status_code().as_u16(),
                "Error occurred: {:?}",
                err
            );

            let body = to_string(&core_error.to_response())
                .map_err(|e| anyhow::anyhow!(e))?;

            let res = Response::builder()
                .status(core_error.status_code())
                .header(CONTENT_TYPE, "application/json")
                .body(body)
                .map(|r| r.into_response())
                .map_err(|e| anyhow::anyhow!(e));

            return Poll::Ready(res);
        }
        Poll::Ready(res)
    }
}

fn format_error_chain(err: &anyhow::Error) -> String {
    err.chain()
        .enumerate()
        .fold(String::new(), |mut output, (i, cause)| {
            let _ = if i == 0 {
                writeln!(output, "Error: {cause}")
            } else {
                writeln!(output, "Caused by: {cause}")
            };
            output
        })
}

fn clone_core_error(err: &CoreError) -> CoreError {
    match err {
        CoreError::Validation { message } => CoreError::Validation {
            message: message.clone(),
        },
        CoreError::NotFound { message } => CoreError::NotFound {
            message: message.clone(),
        },
        CoreError::Unauthorized { message } => CoreError::Unauthorized {
            message: message.clone(),
        },
        CoreError::Forbidden { message } => CoreError::Forbidden {
            message: message.clone(),
        },
        CoreError::Conflict { message } => CoreError::Conflict {
            message: message.clone(),
        },
        CoreError::MissingExtension { name } => CoreError::MissingExtension { name },
        CoreError::Timeout { operation, .. } => CoreError::Timeout {
            operation,
            source: anyhow::anyhow!(err.to_string()),
        },
        CoreError::Network { operation, .. } => CoreError::Network {
            operation,
            source: anyhow::anyhow!(err.to_string()),
        },
        CoreError::Tls { operation, .. } => CoreError::Tls {
            operation,
            source: anyhow::anyhow!(err.to_string()),
        },
        CoreError::Db { operation, .. } => CoreError::Db {
            operation,
            source: anyhow::anyhow!(err.to_string()),
        },
        CoreError::Io { operation, .. } => CoreError::Io {
            operation,
            source: anyhow::anyhow!(err.to_string()),
        },
        CoreError::Internal { operation, .. } => CoreError::Internal {
            operation,
            source: anyhow::anyhow!(err.to_string()),
        },
    }
}
