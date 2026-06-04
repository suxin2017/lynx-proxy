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

use crate::error::{CoreError, root_cause_message};

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
            let _error_reason = format_error_chain(err);
            let error_response = err
                .downcast_ref::<CoreError>()
                .map(|core| core.to_response())
                .unwrap_or_else(|| {
                    CoreError::Internal {
                        operation: "request handling",
                        source: anyhow::anyhow!(root_cause_message(err)),
                    }
                    .to_response()
                });

            error!(
                category = error_response.category,
                status = error_response.code,
                "Error occurred: {:?}",
                err
            );

            let body = to_string(&error_response).map_err(|e| anyhow::anyhow!(e))?;

            let status = http::StatusCode::from_u16(error_response.code)
                .unwrap_or(http::StatusCode::INTERNAL_SERVER_ERROR);
            let res = Response::builder()
                .status(status)
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

