use anyhow::Result;
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};
use lynx_db::dao::request_processing_dao::handlers::LocalFileConfig;
use mime_guess::from_path;
use std::path::Path;
use tokio::fs;

use crate::{common::Req, utils::full};

use super::handler_trait::{HandleRequestType, HandlerTrait};

#[async_trait::async_trait]
impl HandlerTrait for LocalFileConfig {
    async fn handle_request(&self, _request: Req) -> Result<HandleRequestType> {
        let file_path = Path::new(&self.file_path);

        // Check if file exists
        if !file_path.exists() {
            let response = Response::builder()
                .status(StatusCode::NOT_FOUND)
                .header("content-type", "text/plain")
                .body(full(format!("File not found: {}", self.file_path)))?;
            return Ok(HandleRequestType::Response(response.into_response()));
        }

        // Check if it's a file (not directory)
        if !file_path.is_file() {
            let response = Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .header("content-type", "text/plain")
                .body(full(format!("Path is not a file: {}", self.file_path)))?;
            return Ok(HandleRequestType::Response(response.into_response()));
        }

        // Read file content
        match fs::read(&file_path).await {
            Ok(content) => {
                // Determine content type
                let content_type = self
                    .content_type
                    .as_deref()
                    .map(|s| s.to_owned())
                    .unwrap_or_else(|| {
                        let mime_type = from_path(file_path).first_or_octet_stream();
                        mime_type.to_string()
                    });

                // Use configured status code or default to 200
                let status_code = self.status_code.unwrap_or(200);

                let response = Response::builder()
                    .status(StatusCode::from_u16(status_code)?)
                    .header("content-type", content_type)
                    .header("content-length", content.len())
                    .header("x-served-by", "lynx-proxy-local-file")
                    .body(full(content))?;

                Ok(HandleRequestType::Response(response.into_response()))
            }
            Err(e) => {
                let response = Response::builder()
                    .status(StatusCode::INTERNAL_SERVER_ERROR)
                    .header("content-type", "text/plain")
                    .body(full(format!("Failed to read file: {}", e)))?;
                Ok(HandleRequestType::Response(response.into_response()))
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::{Method, Request};
    use http_body_util::BodyExt;
    use std::fs;
    use tempfile::tempdir;

    async fn create_test_file(dir: &Path, filename: &str, content: &str) -> Result<String> {
        let file_path = dir.join(filename);
        fs::write(&file_path, content)?;
        Ok(file_path.to_string_lossy().to_string())
    }

    #[tokio::test]
    async fn test_local_file_handler_successful_file_serving() -> Result<()> {
        let temp_dir = tempdir()?;
        let file_content = "Hello, World! This is a test file.";
        let file_path = create_test_file(temp_dir.path(), "test.txt", file_content).await?;

        let handler = LocalFileConfig {
            file_path,
            content_type: None,
            status_code: None,
        };

        // Create a mock request
        let request = Request::builder()
            .method(Method::GET)
            .uri("http://example.com/test.txt")
            .body(full("test request body"))?;

        // Handle the request
        let result = handler.handle_request(request).await?;

        // Verify the response
        match result {
            HandleRequestType::Response(response) => {
                assert_eq!(response.status(), StatusCode::OK);
                assert_eq!(
                    response.headers().get("content-type").unwrap(),
                    "text/plain"
                );
                assert_eq!(
                    response
                        .headers()
                        .get("content-length")
                        .unwrap()
                        .to_str()
                        .unwrap(),
                    &file_content.len().to_string()
                );
                assert_eq!(
                    response.headers().get("x-served-by").unwrap(),
                    "lynx-proxy-local-file"
                );

                // Verify response body
                let body_bytes = response.into_body().collect().await?.to_bytes();
                let body_str = String::from_utf8(body_bytes.to_vec())?;
                assert_eq!(body_str, file_content);
            }
            _ => panic!("Expected Response, got Request"),
        }

        Ok(())
    }

    #[tokio::test]
    async fn test_local_file_handler_custom_content_type_and_status() -> Result<()> {
        let temp_dir = tempdir()?;
        let file_content = r#"{"message": "Hello JSON"}"#;
        let file_path = create_test_file(temp_dir.path(), "data.json", file_content).await?;

        let handler = LocalFileConfig {
            file_path,
            content_type: Some("application/json".to_string()),
            status_code: Some(201),
        };

        // Create a mock request
        let request = Request::builder()
            .method(Method::GET)
            .uri("http://example.com/data.json")
            .body(full(""))?;

        // Handle the request
        let result = handler.handle_request(request).await?;

        // Verify the response
        match result {
            HandleRequestType::Response(response) => {
                assert_eq!(response.status(), StatusCode::CREATED);
                assert_eq!(
                    response.headers().get("content-type").unwrap(),
                    "application/json"
                );
                assert_eq!(
                    response
                        .headers()
                        .get("content-length")
                        .unwrap()
                        .to_str()
                        .unwrap(),
                    &file_content.len().to_string()
                );

                // Verify response body
                let body_bytes = response.into_body().collect().await?.to_bytes();
                let body_str = String::from_utf8(body_bytes.to_vec())?;
                assert_eq!(body_str, file_content);
            }
            _ => panic!("Expected Response, got Request"),
        }

        Ok(())
    }

    #[tokio::test]
    async fn test_local_file_handler_html_file_mime_detection() -> Result<()> {
        let temp_dir = tempdir()?;
        let file_content = r#"<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Hello HTML</h1></body></html>"#;
        let file_path = create_test_file(temp_dir.path(), "index.html", file_content).await?;

        let handler = LocalFileConfig {
            file_path,
            content_type: None, // Let mime_guess determine content type
            status_code: None,
        };

        // Create a mock request
        let request = Request::builder()
            .method(Method::GET)
            .uri("http://example.com/index.html")
            .body(full(""))?;

        // Handle the request
        let result = handler.handle_request(request).await?;

        // Verify the response
        match result {
            HandleRequestType::Response(response) => {
                assert_eq!(response.status(), StatusCode::OK);
                assert_eq!(response.headers().get("content-type").unwrap(), "text/html");

                // Verify response body
                let body_bytes = response.into_body().collect().await?.to_bytes();
                let body_str = String::from_utf8(body_bytes.to_vec())?;
                assert_eq!(body_str, file_content);
            }
            _ => panic!("Expected Response, got Request"),
        }

        Ok(())
    }

    #[tokio::test]
    async fn test_local_file_handler_file_not_found() -> Result<()> {
        let handler = LocalFileConfig {
            file_path: "/non/existent/file.txt".to_string(),
            content_type: None,
            status_code: None,
        };

        // Create a mock request
        let request = Request::builder()
            .method(Method::GET)
            .uri("http://example.com/missing.txt")
            .body(full(""))?;

        // Handle the request
        let result = handler.handle_request(request).await?;

        // Verify the response
        match result {
            HandleRequestType::Response(response) => {
                assert_eq!(response.status(), StatusCode::NOT_FOUND);
                assert_eq!(
                    response.headers().get("content-type").unwrap(),
                    "text/plain"
                );

                // Verify response body contains error message
                let body_bytes = response.into_body().collect().await?.to_bytes();
                let body_str = String::from_utf8(body_bytes.to_vec())?;
                assert!(body_str.contains("File not found"));
                assert!(body_str.contains("/non/existent/file.txt"));
            }
            _ => panic!("Expected Response, got Request"),
        }

        Ok(())
    }

    #[tokio::test]
    async fn test_local_file_handler_directory_instead_of_file() -> Result<()> {
        let temp_dir = tempdir()?;
        let dir_path = temp_dir.path().join("test_directory");
        fs::create_dir(&dir_path)?;

        let handler = LocalFileConfig {
            file_path: dir_path.to_string_lossy().to_string(),
            content_type: None,
            status_code: None,
        };

        // Create a mock request
        let request = Request::builder()
            .method(Method::GET)
            .uri("http://example.com/directory")
            .body(full(""))?;

        // Handle the request
        let result = handler.handle_request(request).await?;

        // Verify the response
        match result {
            HandleRequestType::Response(response) => {
                assert_eq!(response.status(), StatusCode::BAD_REQUEST);
                assert_eq!(
                    response.headers().get("content-type").unwrap(),
                    "text/plain"
                );

                // Verify response body contains error message
                let body_bytes = response.into_body().collect().await?.to_bytes();
                let body_str = String::from_utf8(body_bytes.to_vec())?;
                assert!(body_str.contains("Path is not a file"));
            }
            _ => panic!("Expected Response, got Request"),
        }

        Ok(())
    }

    #[tokio::test]
    async fn test_local_file_handler_binary_file() -> Result<()> {
        let temp_dir = tempdir()?;
        let binary_content = vec![0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]; // PNG header
        let file_path = temp_dir.path().join("test.png");
        fs::write(&file_path, &binary_content)?;

        let handler = LocalFileConfig {
            file_path: file_path.to_string_lossy().to_string(),
            content_type: None, // Let mime_guess determine content type
            status_code: None,
        };

        // Create a mock request
        let request = Request::builder()
            .method(Method::GET)
            .uri("http://example.com/test.png")
            .body(full(""))?;

        // Handle the request
        let result = handler.handle_request(request).await?;

        // Verify the response
        match result {
            HandleRequestType::Response(response) => {
                assert_eq!(response.status(), StatusCode::OK);
                assert_eq!(response.headers().get("content-type").unwrap(), "image/png");
                assert_eq!(
                    response
                        .headers()
                        .get("content-length")
                        .unwrap()
                        .to_str()
                        .unwrap(),
                    &binary_content.len().to_string()
                );

                // Verify response body
                let body_bytes = response.into_body().collect().await?.to_bytes();
                assert_eq!(body_bytes.to_vec(), binary_content);
            }
            _ => panic!("Expected Response, got Request"),
        }

        Ok(())
    }

    #[tokio::test]
    async fn test_local_file_handler_empty_file() -> Result<()> {
        let temp_dir = tempdir()?;
        let file_path = create_test_file(temp_dir.path(), "empty.txt", "").await?;

        let handler = LocalFileConfig {
            file_path,
            content_type: Some("text/plain".to_string()),
            status_code: Some(204), // No Content
        };

        // Create a mock request
        let request = Request::builder()
            .method(Method::GET)
            .uri("http://example.com/empty.txt")
            .body(full(""))?;

        // Handle the request
        let result = handler.handle_request(request).await?;

        // Verify the response
        match result {
            HandleRequestType::Response(response) => {
                assert_eq!(response.status(), StatusCode::NO_CONTENT);
                assert_eq!(
                    response.headers().get("content-type").unwrap(),
                    "text/plain"
                );
                assert_eq!(
                    response
                        .headers()
                        .get("content-length")
                        .unwrap()
                        .to_str()
                        .unwrap(),
                    "0"
                );

                // Verify response body is empty
                let body_bytes = response.into_body().collect().await?.to_bytes();
                assert!(body_bytes.is_empty());
            }
            _ => panic!("Expected Response, got Request"),
        }

        Ok(())
    }

    #[tokio::test]
    async fn test_local_file_handler_large_file() -> Result<()> {
        let temp_dir = tempdir()?;
        let large_content = "A".repeat(10000); // 10KB file
        let file_path = create_test_file(temp_dir.path(), "large.txt", &large_content).await?;

        let handler = LocalFileConfig {
            file_path,
            content_type: None,
            status_code: None,
        };

        // Create a mock request
        let request = Request::builder()
            .method(Method::GET)
            .uri("http://example.com/large.txt")
            .body(full(""))?;

        // Handle the request
        let result = handler.handle_request(request).await?;

        // Verify the response
        match result {
            HandleRequestType::Response(response) => {
                assert_eq!(response.status(), StatusCode::OK);
                assert_eq!(
                    response
                        .headers()
                        .get("content-length")
                        .unwrap()
                        .to_str()
                        .unwrap(),
                    "10000"
                );

                // Verify response body
                let body_bytes = response.into_body().collect().await?.to_bytes();
                let body_str = String::from_utf8(body_bytes.to_vec())?;
                assert_eq!(body_str, large_content);
            }
            _ => panic!("Expected Response, got Request"),
        }

        Ok(())
    }
}
