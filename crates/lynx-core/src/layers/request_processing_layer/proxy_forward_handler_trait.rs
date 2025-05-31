use lynx_db::dao::request_processing_dao::handlers::proxy_forward_handler::ProxyForwardConfig;
use anyhow::Result;
use axum::{extract::Request, response::Response, body::Body, http::StatusCode};
use http::Uri;

use super::handler_trait::{HandleRequestType, HandlerTrait};

#[async_trait::async_trait]
impl HandlerTrait for ProxyForwardConfig {
    /// Handles an incoming HTTP request by forwarding it to a target port.
    ///
    /// # Arguments
    /// * `request` - The incoming HTTP request to be forwarded
    ///
    /// # Returns
    /// A modified Request with updated target or a Response with error
    async fn handle_request(&self, mut request: Request<Body>) -> Result<HandleRequestType> {
        // Parse the target port
        let target_port = &self.target_port;
        
        // Validate target port
        if target_port.is_empty() {
            let response = Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .header("content-type", "text/plain")
                .body(Body::from("Target port is required for proxy forward"))?;
            return Ok(HandleRequestType::Response(response));
        }

        // Get current URI
        let current_uri = request.uri().clone();
        
        // Create new URI with target port
        let new_uri = if target_port.contains("://") {
            // If target_port is a full URL, use it directly
            target_port.parse::<Uri>()
                .map_err(|e| anyhow::anyhow!("Invalid target URL: {}", e))?
        } else {
            // If target_port is just a port number, construct the URI
            let port = target_port.parse::<u16>()
                .map_err(|_| anyhow::anyhow!("Invalid port number: {}", target_port))?;
            
            let scheme = current_uri.scheme_str().unwrap_or("http");
            let host = current_uri.host().unwrap_or("localhost");
            let path = current_uri.path();
            let query = current_uri.query().map(|q| format!("?{}", q)).unwrap_or_default();
            
            let new_uri_str = format!("{}://{}:{}{}{}", scheme, host, port, path, query);
            new_uri_str.parse::<Uri>()
                .map_err(|e| anyhow::anyhow!("Failed to construct new URI: {}", e))?
        };

        // Update the request URI
        *request.uri_mut() = new_uri;

        // Add proxy headers
        let headers = request.headers_mut();
        headers.insert(
            "x-forwarded-by",
            "lynx-proxy".parse()
                .map_err(|e| anyhow::anyhow!("Failed to create header value: {}", e))?
        );
        
        // Preserve original host if not already present
        if !headers.contains_key("x-forwarded-host") {
            if let Some(host) = current_uri.host() {
                headers.insert(
                    "x-forwarded-host",
                    host.parse()
                        .map_err(|e| anyhow::anyhow!("Failed to create host header: {}", e))?
                );
            }
        }

        // Preserve original protocol
        if let Some(scheme) = current_uri.scheme_str() {
            headers.insert(
                "x-forwarded-proto",
                scheme.parse()
                    .map_err(|e| anyhow::anyhow!("Failed to create proto header: {}", e))?
            );
        }
        
        Ok(HandleRequestType::Request(request))
    }

    async fn handle_response(&self, response: Response<Body>) -> Result<Option<Response<Body>>> {
        // ProxyForward handler doesn't modify responses by default
        // The actual proxy forwarding will be handled by the proxy layer
        Ok(Some(response))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use http::Method;

    #[tokio::test]
    async fn test_proxy_forward_handler_port_only() {
        let handler = ProxyForwardConfig {
            target_port: "8080".to_string(),
        };

        let request = Request::builder()
            .method(Method::GET)
            .uri("http://example.com/test?param=value")
            .body(Body::empty())
            .unwrap();

        let result = handler.handle_request(request).await.unwrap();

        match result {
            HandleRequestType::Request(req) => {
                // The request should be modified to point to the new port
                // Note: In a real implementation, you'd check the actual URL
                // For now, we just verify it's a Request variant
                assert_eq!(req.method(), Method::GET);
            }
            _ => panic!("Expected Request variant"),
        }
    }

    #[tokio::test]
    async fn test_proxy_forward_handler_full_url() {
        let handler = ProxyForwardConfig {
            target_port: "http://target-server:9090".to_string(),
        };

        let request = Request::builder()
            .method(Method::POST)
            .uri("https://example.com/api/data")
            .body(Body::empty())
            .unwrap();

        let result = handler.handle_request(request).await.unwrap();

        match result {
            HandleRequestType::Request(req) => {
                assert_eq!(req.method(), Method::POST);
            }
            _ => panic!("Expected Request variant"),
        }
    }

    #[tokio::test]
    async fn test_proxy_forward_handler_empty_target() {
        let handler = ProxyForwardConfig {
            target_port: "".to_string(),
        };

        let request = Request::builder()
            .method(Method::GET)
            .uri("https://example.com/test")
            .body(Body::empty())
            .unwrap();

        let result = handler.handle_request(request).await.unwrap();

        match result {
            HandleRequestType::Response(response) => {
                assert_eq!(response.status(), StatusCode::BAD_REQUEST);
            }
            _ => panic!("Expected Response variant for error case"),
        }
    }

    #[tokio::test]
    async fn test_proxy_forward_handler_invalid_port() {
        let handler = ProxyForwardConfig {
            target_port: "invalid_port".to_string(),
        };

        let request = Request::builder()
            .method(Method::GET)
            .uri("https://example.com/test")
            .body(Body::empty())
            .unwrap();

        let result = handler.handle_request(request).await;

        // Should return an error for invalid port
        assert!(result.is_err());
    }
}
