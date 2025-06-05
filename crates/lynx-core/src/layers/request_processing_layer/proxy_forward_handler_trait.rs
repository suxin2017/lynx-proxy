use anyhow::Result;
use http::Uri;
use lynx_db::dao::request_processing_dao::handlers::proxy_forward_handler::ProxyForwardConfig;

use super::handler_trait::{HandleRequestType, HandlerTrait};
use crate::common::Req;

#[async_trait::async_trait]
impl HandlerTrait for ProxyForwardConfig {
    async fn handle_request(&self, mut request: Req) -> Result<HandleRequestType> {
        // Get the current request URI
        let current_uri = request.uri().clone();
        let original_uri_str = current_uri.to_string(); // 保存原始URI字符串用于日志
        let current_parts = current_uri.into_parts();

        // Build new URI with target configuration, keeping original components as fallback
        let mut uri_builder = Uri::builder();

        // Use target scheme or fallback to original
        let scheme = if let Some(target_scheme) = &self.target_scheme {
            target_scheme.parse().ok()
        } else {
            current_parts.scheme
        };
        if let Some(scheme) = scheme {
            uri_builder = uri_builder.scheme(scheme);
        }

        // Use target authority or fallback to original
        let authority = if let Some(target_authority) = &self.target_authority {
            target_authority.parse().ok()
        } else {
            current_parts.authority
        };
        if let Some(authority) = authority {
            uri_builder = uri_builder.authority(authority);
        }

        // Use target path or original path and query
        let path_and_query = if let Some(target_path) = &self.target_path {
            if let Some(current_pq) = current_parts.path_and_query {
                // Combine target path with original query
                if target_path != "/" {
                    format!(
                        "{}{}?{}",
                        target_path,
                        current_pq.path(),
                        current_pq.query().unwrap_or("")
                    )
                } else {
                    format!("{}?{}", current_pq.path(), current_pq.query().unwrap_or(""))
                }
            } else {
                target_path.clone()
            }
        } else if let Some(current_pq) = current_parts.path_and_query {
            current_pq.to_string()
        } else {
            "/".to_string()
        };

        uri_builder = uri_builder.path_and_query(path_and_query);

        // Build the new URI and update the request
        let new_uri = uri_builder.build()?;
        *request.uri_mut() = new_uri;

        tracing::trace!(
            "Proxying request from {} to {}",
            original_uri_str,
            request.uri()
        );

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
            target_scheme: Some("http".to_string()),
            target_authority: Some("example.com:8080".to_string()),
            target_path: None,
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
            target_scheme: Some("http".to_string()),
            target_authority: Some("127.0.0.1:9090".to_string()),
            target_path: None,
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
            target_scheme: Some("https".to_string()),
            target_authority: Some("secure.example.com:8443".to_string()),
            target_path: None,
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
            target_scheme: Some("http".to_string()),
            target_authority: Some("api.service.com".to_string()),
            target_path: None,
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
            target_scheme: Some("http".to_string()),
            target_authority: Some("backend.internal:5000".to_string()),
            target_path: None,
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
            target_scheme: Some("http".to_string()),
            target_authority: Some("microservice:8080".to_string()),
            target_path: None,
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
            target_scheme: Some("http".to_string()),
            target_authority: Some("development.local:65432".to_string()),
            target_path: None,
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

    #[tokio::test]
    async fn test_proxy_forward_websocket_port() {
        // Test forwarding WebSocket to different port
        let config = ProxyForwardConfig {
            target_scheme: Some("ws".to_string()),
            target_authority: Some("websocket.service:3001".to_string()),
            target_path: None,
        };

        let request = Request::builder()
            .method(Method::GET)
            .uri("ws://localhost:8080/socket?token=abcdef")
            .body(empty())
            .unwrap();

        let result = config.handle_request(request).await.unwrap();

        match result {
            HandleRequestType::Request(modified_request) => {
                let uri = modified_request.uri();
                assert_eq!(uri.scheme_str(), Some("ws"));
                assert_eq!(uri.authority().unwrap().as_str(), "websocket.service:3001");
                assert_eq!(uri.path(), "/socket");
                assert_eq!(uri.query(), Some("token=abcdef"));
            }
            HandleRequestType::Response(_) => panic!("Expected request, got response"),
        }
    }

    #[tokio::test]
    async fn test_proxy_forward_port_range_validation() {
        // Test forwarding to ports in different ranges
        let test_cases = vec![
            ("localhost:80", "Standard HTTP port"),
            ("localhost:443", "Standard HTTPS port"),
            ("localhost:8080", "Common proxy port"),
            ("localhost:3000", "Development port"),
            ("localhost:9000", "High numbered port"),
            ("localhost:65535", "Maximum port number"),
        ];

        for (authority, _description) in test_cases {
            let config = ProxyForwardConfig {
                target_scheme: Some("http".to_string()),
                target_authority: Some(authority.to_string()),
                target_path: None,
            };

            let request = Request::builder()
                .method(Method::GET)
                .uri("http://original.com:5000/test")
                .body(empty())
                .unwrap();

            let result = config.handle_request(request).await.unwrap();

            match result {
                HandleRequestType::Request(modified_request) => {
                    let uri = modified_request.uri();
                    assert_eq!(uri.authority().unwrap().as_str(), authority);
                    assert_eq!(uri.path(), "/test");
                }
                HandleRequestType::Response(_) => panic!("Expected request, got response"),
            }
        }
    }

    #[tokio::test]
    async fn test_proxy_forward_preserve_original_port_in_logs() {
        // Test that logs show both original and target ports
        let config = ProxyForwardConfig {
            target_scheme: Some("https".to_string()),
            target_authority: Some("api.backend:9443".to_string()),
            target_path: None,
        };

        let request = Request::builder()
            .method(Method::POST)
            .uri("http://frontend:3000/api/data?id=123")
            .body(empty())
            .unwrap();
        let result = config.handle_request(request).await.unwrap();

        match result {
            HandleRequestType::Request(modified_request) => {
                let uri = modified_request.uri();
                assert_eq!(uri.scheme_str(), Some("https"));
                assert_eq!(uri.authority().unwrap().as_str(), "api.backend:9443");
                assert_eq!(uri.path(), "/api/data");
                assert_eq!(uri.query(), Some("id=123"));
            }
            HandleRequestType::Response(_) => panic!("Expected request, got response"),
        }
    }
}
