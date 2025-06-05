use anyhow::Result;
use axum::{http::StatusCode, response::{IntoResponse, Response}};
use lynx_db::dao::request_processing_dao::handlers::BlockHandlerConfig;

use crate::{common::Req, utils::full};

use super::handler_trait::{HandleRequestType, HandlerTrait};

#[async_trait::async_trait]
impl HandlerTrait for BlockHandlerConfig {
    async fn handle_request(&self, _request: Req) -> Result<HandleRequestType> {
        let status_code = self.status_code.unwrap_or(403);
        let reason = self
            .reason
            .clone()
            .unwrap_or_else(|| "Access blocked by proxy".to_string());

        let response = Response::builder()
            .status(StatusCode::from_u16(status_code)?)
            .header("content-type", "text/plain, charset=utf-8")
            .header("x-blocked-by", "lynx-proxy")
            .body(full(reason))?;

        Ok(HandleRequestType::Response(response.into_response()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::Method;
    use http::Request;
    use http_body_util::BodyExt;

    #[tokio::test]
    async fn test_block_handler_default_config() -> Result<()> {
        let handler = BlockHandlerConfig::default();

        // Create a mock request
        let request = Request::builder()
            .method(Method::GET)
            .uri("http://example.com/test")
            .body(full("test request body"))?;

        // Handle the request
        let result = handler.handle_request(request).await?;

        // Verify the response
        match result {
            HandleRequestType::Response(response) => {
                assert_eq!(response.status(), StatusCode::from_u16(403)?);
                assert_eq!(
                    response.headers().get("content-type").unwrap(),
                    "text/plain"
                );
                assert_eq!(
                    response.headers().get("x-blocked-by").unwrap(),
                    "lynx-proxy"
                );

                // Verify response body
                let body_bytes = response.into_body().collect().await?.to_bytes();
                let body_str = String::from_utf8(body_bytes.to_vec())?;
                assert_eq!(body_str, "Access blocked by proxy");
            }
            _ => panic!("Expected Response, got Request"),
        }

        Ok(())
    }

    #[tokio::test]
    async fn test_block_handler_custom_config() -> Result<()> {
        let handler = BlockHandlerConfig {
            status_code: Some(429),
            reason: Some("Rate limit exceeded".to_string()),
        };

        // Create a mock request
        let request = Request::builder()
            .method(Method::POST)
            .uri("http://example.com/api/data")
            .body(full("some data"))?;

        // Handle the request
        let result = handler.handle_request(request).await?;

        // Verify the response
        match result {
            HandleRequestType::Response(response) => {
                assert_eq!(response.status(), StatusCode::from_u16(429)?);
                assert_eq!(
                    response.headers().get("content-type").unwrap(),
                    "text/plain"
                );
                assert_eq!(
                    response.headers().get("x-blocked-by").unwrap(),
                    "lynx-proxy"
                );

                // Verify response body
                let body_bytes = response.into_body().collect().await?.to_bytes();
                let body_str = String::from_utf8(body_bytes.to_vec())?;
                assert_eq!(body_str, "Rate limit exceeded");
            }
            _ => panic!("Expected Response, got Request"),
        }

        Ok(())
    }

    #[tokio::test]
    async fn test_block_handler_with_none_values() -> Result<()> {
        let handler = BlockHandlerConfig {
            status_code: None,
            reason: None,
        };

        // Create a mock request
        let request = Request::builder()
            .method(Method::DELETE)
            .uri("http://example.com/resource/123")
            .body(full(""))?;

        // Handle the request
        let result = handler.handle_request(request).await?;

        // Verify the response uses default values
        match result {
            HandleRequestType::Response(response) => {
                assert_eq!(response.status(), StatusCode::from_u16(403)?);

                // Verify response body uses default reason
                let body_bytes = response.into_body().collect().await?.to_bytes();
                let body_str = String::from_utf8(body_bytes.to_vec())?;
                assert_eq!(body_str, "Access blocked by proxy");
            }
            _ => panic!("Expected Response, got Request"),
        }

        Ok(())
    }
}
