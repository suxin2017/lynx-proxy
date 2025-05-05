use std::{
    fmt::Write,
    task::{Context, Poll, ready},
};

use anyhow::Result;
use axum::response::{IntoResponse, Response};
use http::StatusCode;
use pin_project_lite::pin_project;
use tracing::error;


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
            error!("Error occurred: {:?}", err);
            let error_reason =
                err.chain()
                    .enumerate()
                    .fold(String::new(), |mut output, (i, cause)| {
                        let _ = if i == 0 {
                            writeln!(output, "Error: {cause}")
                        } else {
                            writeln!(output, "Caused by: {cause}")
                        };
                        output
                    });

            let res = Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body(error_reason)
                .map(|r| r.into_response())
                .map_err(|e| anyhow::anyhow!(e));

            return Poll::Ready(res);
        }
        Poll::Ready(res)
    }
}
