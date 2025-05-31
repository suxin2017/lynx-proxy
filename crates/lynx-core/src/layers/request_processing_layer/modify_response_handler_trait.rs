use anyhow::Result;
use axum::{body::Body, extract::Request, response::Response};
use lynx_db::dao::request_processing_dao::handlers::modify_response_handler::ModifyResponseConfig;

use super::handler_trait::{HandleRequestType, HandlerTrait};

#[async_trait::async_trait]
impl HandlerTrait for ModifyResponseConfig {
    /// ModifyResponse handler processes requests by letting them pass through
    /// The actual modification happens in handle_response
    async fn handle_request(&self, request: Request<Body>) -> Result<HandleRequestType> {
        Ok(HandleRequestType::Request(request))
    }

    async fn handle_response(
        &self,
        mut response: Response<Body>,
    ) -> Result<Option<Response<Body>>> {
        // Modify headers if specified
        if let Some(ref modify_headers) = self.modify_headers {
            let headers = response.headers_mut();
            for (key, value) in modify_headers {
                if let (Ok(header_name), Ok(header_value)) = (
                    key.parse::<http::HeaderName>(),
                    value.parse::<http::HeaderValue>(),
                ) {
                    headers.insert(header_name, header_value);
                }
            }
        }

        // Modify body if specified
        if let Some(ref new_body) = self.modify_body {
            let body_bytes = new_body.as_bytes().to_vec();
            // Update content-length header
            if let Ok(content_length) = body_bytes.len().to_string().parse() {
                response
                    .headers_mut()
                    .insert("content-length", content_length);
            }
            let new_response_body = Body::from(body_bytes);

            *response.body_mut() = new_response_body;
        }

        Ok(Some(response))
    }
}
