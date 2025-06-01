use anyhow::Result;
use http::Uri;
use lynx_db::dao::request_processing_dao::handlers::proxy_forward_handler::ProxyForwardConfig;

use super::handler_trait::{HandleRequestType, HandlerTrait};
use crate::common::Req;

#[async_trait::async_trait]
impl HandlerTrait for ProxyForwardConfig {
    async fn handle_request(&self, mut request: Req) -> Result<HandleRequestType> {
        // Parse the target URL from the configuration
        let target_uri = self.target.parse::<Uri>()?;
        let target_parts = target_uri.into_parts();

        // Get the current request URI
        let current_uri = request.uri().clone();
        let current_parts = current_uri.into_parts();

        // Build new URI with target's scheme and authority, but keep original path and query
        let mut uri_builder = Uri::builder();

        // Use target's scheme or fallback to original
        if let Some(scheme) = target_parts.scheme.or(current_parts.scheme) {
            uri_builder = uri_builder.scheme(scheme);
        }

        // Use target's authority or fallback to original
        if let Some(authority) = target_parts.authority.or(current_parts.authority) {
            uri_builder = uri_builder.authority(authority);
        }

        // Use original path and query, or target's if original doesn't have them
        if let Some(path_and_query) = current_parts.path_and_query.or(target_parts.path_and_query) {
            uri_builder = uri_builder.path_and_query(path_and_query);
        }

        // Build the new URI and update the request
        let new_uri = uri_builder.build()?;
        *request.uri_mut() = new_uri;

        println!("Modified URI: {}", request.uri());

        Ok(HandleRequestType::Request(request))
    }
}

#[cfg(test)]
mod tests {
    use crate::utils::empty;

    use super::*;
    use axum::http::Method;
    use http::Request;

    #[tokio::test]
    async fn test_proxy_forward_basic() {
        let config = ProxyForwardConfig {
            target: "http://example.com:8080".to_string(),
        };

        let request = Request::builder()
            .method(Method::GET)
            .uri("http://localhost/test?param=value")
            .body(empty())
            .unwrap();

        let result = config.handle_request(request).await.unwrap();

        match result {
            HandleRequestType::Request(modified_request) => {
                let uri = modified_request.uri();
                assert_eq!(uri.scheme_str(), Some("http"));
                assert_eq!(uri.authority().unwrap().as_str(), "example.com:8080");
                assert_eq!(uri.path(), "/test");
                assert_eq!(uri.query(), Some("param=value"));
            }
            HandleRequestType::Response(_) => panic!("Expected request, got response"),
        }
    }

    #[tokio::test]
    async fn test_proxy_forward_port_only() {
        // Test forwarding to a different port on the same host
        let config = ProxyForwardConfig {
            target: "127.0.0.1:9090".to_string(),
        };

        let request = Request::builder()
            .method(Method::POST)
            .uri("http://localhost:3000/api/users")
            .body(empty())
            .unwrap();

        let result = config.handle_request(request).await.unwrap();

        match result {
            HandleRequestType::Request(modified_request) => {
                let uri = modified_request.uri();
                println!("Modified URI: {}", uri);
                assert_eq!(uri.scheme_str(), Some("http"));
                assert_eq!(uri.authority().unwrap().as_str(), "127.0.0.1:9090");
                assert_eq!(uri.path(), "/api/users");
                assert_eq!(uri.query(), None);
            }
            HandleRequestType::Response(_) => panic!("Expected request, got response"),
        }
    }

    #[tokio::test]
    async fn test_proxy_forward_https_port() {
        // Test forwarding to HTTPS with custom port
        let config = ProxyForwardConfig {
            target: "https://secure.example.com:8443".to_string(),
        };

        let request = Request::builder()
            .method(Method::PUT)
            .uri("http://localhost/secure/endpoint?token=abc123")
            .body(empty())
            .unwrap();

        let result = config.handle_request(request).await.unwrap();

        match result {
            HandleRequestType::Request(modified_request) => {
                let uri = modified_request.uri();
                assert_eq!(uri.scheme_str(), Some("https"));
                assert_eq!(uri.authority().unwrap().as_str(), "secure.example.com:8443");
                assert_eq!(uri.path(), "/secure/endpoint");
                assert_eq!(uri.query(), Some("token=abc123"));
            }
            HandleRequestType::Response(_) => panic!("Expected request, got response"),
        }
    }

    #[tokio::test]
    async fn test_proxy_forward_standard_ports() {
        // Test forwarding to standard HTTP port (80)
        let config = ProxyForwardConfig {
            target: "http://api.service.com".to_string(),
        };

        let request = Request::builder()
            .method(Method::GET)
            .uri("http://localhost:8000/health")
            .body(empty())
            .unwrap();

        let result = config.handle_request(request).await.unwrap();

        match result {
            HandleRequestType::Request(modified_request) => {
                let uri = modified_request.uri();
                assert_eq!(uri.scheme_str(), Some("http"));
                assert_eq!(uri.authority().unwrap().as_str(), "api.service.com");
                assert_eq!(uri.path(), "/health");
            }
            HandleRequestType::Response(_) => panic!("Expected request, got response"),
        }
    }

    #[tokio::test]
    async fn test_proxy_forward_different_host_and_port() {
        // Test forwarding to completely different host and port
        let config = ProxyForwardConfig {
            target: "http://backend.internal:5000".to_string(),
        };

        let request = Request::builder()
            .method(Method::DELETE)
            .uri("https://frontend.app:3000/delete/item/123?confirm=true")
            .body(empty())
            .unwrap();

        let result = config.handle_request(request).await.unwrap();

        match result {
            HandleRequestType::Request(modified_request) => {
                let uri = modified_request.uri();
                assert_eq!(uri.scheme_str(), Some("http"));
                assert_eq!(uri.authority().unwrap().as_str(), "backend.internal:5000");
                assert_eq!(uri.path(), "/delete/item/123");
                assert_eq!(uri.query(), Some("confirm=true"));
            }
            HandleRequestType::Response(_) => panic!("Expected request, got response"),
        }
    }

    #[tokio::test]
    async fn test_proxy_forward_preserve_complex_path() {
        // Test forwarding with complex path and multiple query parameters
        let config = ProxyForwardConfig {
            target: "http://microservice:8080".to_string(),
        };

        let request = Request::builder()
            .method(Method::PATCH)
            .uri("http://gateway/v2/users/profile/update?user_id=456&version=2&format=json")
            .body(empty())
            .unwrap();

        let result = config.handle_request(request).await.unwrap();

        match result {
            HandleRequestType::Request(modified_request) => {
                let uri = modified_request.uri();
                assert_eq!(uri.scheme_str(), Some("http"));
                assert_eq!(uri.authority().unwrap().as_str(), "microservice:8080");
                assert_eq!(uri.path(), "/v2/users/profile/update");
                assert_eq!(uri.query(), Some("user_id=456&version=2&format=json"));
            }
            HandleRequestType::Response(_) => panic!("Expected request, got response"),
        }
    }

    #[tokio::test]
    async fn test_proxy_forward_high_port_number() {
        // Test forwarding to high port number
        let config = ProxyForwardConfig {
            target: "http://development.local:65432".to_string(),
        };

        let request = Request::builder()
            .method(Method::GET)
            .uri("http://localhost:8080/debug/metrics")
            .body(empty())
            .unwrap();

        let result = config.handle_request(request).await.unwrap();

        match result {
            HandleRequestType::Request(modified_request) => {
                let uri = modified_request.uri();
                assert_eq!(uri.scheme_str(), Some("http"));
                assert_eq!(uri.authority().unwrap().as_str(), "development.local:65432");
                assert_eq!(uri.path(), "/debug/metrics");
            }
            HandleRequestType::Response(_) => panic!("Expected request, got response"),
        }
    }
}
