use crate::common::Req;
use anyhow::Result;
use axum::response::Response;

/// Represents the type of result returned by request handling operations.
/// This enum allows handlers to return either processed request information
/// or response information based on the handling logic.
pub enum HandleRequestType {
    /// Contains processed request information
    Request(Req),
    /// Contains processed response information
    Response(Response),
}

#[async_trait::async_trait]
pub trait HandlerTrait {
    async fn handle_request(&self, request: Req) -> Result<HandleRequestType>;

    async fn handle_response(&self, response: Response) -> Result<Response> {
        Ok(response)
    }
}
