use lynx_db::dao::request_processing_dao::handlers::ModifyRequestConfig;
use anyhow::Result;
use axum::{extract::Request, response::Response, body::Body};

use super::handler_trait::{HandleRequestType, HandlerTrait};

#[async_trait::async_trait]
impl HandlerTrait for ModifyRequestConfig {
    /// Handles an incoming HTTP request by modifying it according to the configuration.
    async fn handle_request(&self, mut request: Request<Body>) -> Result<HandleRequestType> {
        // Modify headers if specified
        if let Some(ref modify_headers) = self.modify_headers {
            let headers = request.headers_mut();
            for (key, value) in modify_headers {
                if let (Ok(header_name), Ok(header_value)) = (key.parse::<http::HeaderName>(), value.parse::<http::HeaderValue>()) {
                    headers.insert(header_name, header_value);
                }
            }
        }

        // Modify method if specified
        if let Some(ref new_method) = self.modify_method {
            if let Ok(method) = new_method.parse() {
                *request.method_mut() = method;
            }
        }

        // Modify URL if specified
        if let Some(ref new_url) = self.modify_url {
            if let Ok(uri) = new_url.parse() {
                *request.uri_mut() = uri;
            }
        }

        // Modify body if specified
        if let Some(ref new_body) = self.modify_body {
            let body_bytes = new_body.as_bytes().to_vec();
            let new_body = Body::from(body_bytes);
            *request.body_mut() = new_body;
        }
        
        Ok(HandleRequestType::Request(request))
    }

    async fn handle_response(&self, response: Response<Body>) -> Result<Option<Response<Body>>> {
        // ModifyRequest handler doesn't modify responses
        Ok(Some(response))
    }
}

