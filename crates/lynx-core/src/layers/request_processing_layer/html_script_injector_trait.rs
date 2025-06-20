use anyhow::Result;
use async_compression::tokio::bufread::{BrotliDecoder, DeflateDecoder, GzipDecoder};
use axum::{body::Body, response::Response};
use bytes::Bytes;
use http::header::{CONTENT_ENCODING, CONTENT_LENGTH};
use http_body_util::{BodyExt, Full};
use lynx_db::dao::request_processing_dao::handlers::HtmlScriptInjectorConfig;
use regex::Regex;
use tokio::io::{AsyncReadExt, BufReader};
use tracing::warn;

use super::handler_trait::{HandleRequestType, HandlerTrait};
use crate::common::Req;

#[async_trait::async_trait]
impl HandlerTrait for HtmlScriptInjectorConfig {
    async fn handle_request(&self, request: Req) -> Result<HandleRequestType> {
        // Pass request through unchanged for response handlers
        Ok(HandleRequestType::Request(request))
    }

    async fn handle_response(&self, mut response: Response) -> Result<Response> {
        // Check if this is an HTML response
        if let Some(content_type) = response.headers().get("content-type") {
            let content_type_str = content_type.to_str().unwrap_or("");

            // Only process HTML content
            if !content_type_str.contains("text/html") {
                return Ok(response);
            }
        } else {
            // No content-type header, skip injection
            return Ok(response);
        }

        // Get the response body
        let body_bytes = match http_body_util::BodyExt::collect(response.body_mut()).await {
            Ok(collected) => collected.to_bytes(),
            Err(_) => return Ok(response), // Return unchanged if can't read body
        };

        // Check if the response is compressed and decompress if needed
        let content_encoding = response
            .headers()
            .get(CONTENT_ENCODING)
            .and_then(|v| v.to_str().ok())
            .unwrap_or("");

        let decompressed_bytes = match content_encoding.to_lowercase().as_str() {
            "gzip" => {
                match self.decompress_gzip(&body_bytes).await {
                    Ok(bytes) => bytes,
                    Err(e) => {
                        warn!("Failed to decompress gzip content: {}", e);
                        body_bytes // Fall back to original bytes
                    }
                }
            }
            "deflate" => {
                match self.decompress_deflate(&body_bytes).await {
                    Ok(bytes) => bytes,
                    Err(e) => {
                        warn!("Failed to decompress deflate content: {}", e);
                        body_bytes // Fall back to original bytes
                    }
                }
            }
            "br" => {
                match self.decompress_brotli(&body_bytes).await {
                    Ok(bytes) => bytes,
                    Err(e) => {
                        warn!("Failed to decompress brotli content: {}", e);
                        body_bytes // Fall back to original bytes
                    }
                }
            }
            _ => body_bytes, // No compression or unsupported
        };

        let mut body_str = match String::from_utf8(decompressed_bytes.to_vec()) {
            Ok(s) => s,
            Err(_) => return Ok(response), // Return unchanged if not valid UTF-8
        };

        // Generate content tag
        let content_tag = self.generate_content_tag();
        if content_tag.is_empty() {
            // Need to restore the original body since it was consumed
            let new_body = Full::new(decompressed_bytes.clone())
                .map_err(|e| anyhow::anyhow!("Body error: {}", e))
                .boxed();
            *response.body_mut() = Body::new(new_body);
            return Ok(response); // No content to inject
        }

        // Inject content based on position
        let injection_pos = self.injection_position.as_deref().unwrap_or("body-end");
        body_str = match injection_pos {
            "head" => self.inject_in_head(&body_str, &content_tag),
            "body-start" => self.inject_in_body_start(&body_str, &content_tag),
            "body-end" => self.inject_in_body_end(&body_str, &content_tag),
            _ => self.inject_in_body_end(&body_str, &content_tag),
        };

        // Remove content-encoding header since we're returning uncompressed content
        response.headers_mut().remove(CONTENT_ENCODING);
        response.headers_mut().remove(CONTENT_LENGTH);
        
        // Remove cache-related headers to prevent caching of modified content
        response.headers_mut().remove("cache-control");
        response.headers_mut().remove("etag");
        response.headers_mut().remove("last-modified");
        response.headers_mut().remove("expires");
        response.headers_mut().remove("if-none-match");
        response.headers_mut().remove("if-modified-since");

        // Handle content-length and transfer-encoding headers properly
        let new_body_bytes = body_str.as_bytes();
        let headers = response.headers_mut();

        // Check if transfer-encoding is chunked
        let is_chunked = headers
            .get("transfer-encoding")
            .and_then(|v| v.to_str().ok())
            .map(|v| v.to_lowercase().contains("chunked"))
            .unwrap_or(false);

        if is_chunked {
            // If transfer-encoding is chunked, remove content-length (HTTP/1.1 spec requirement)
            headers.remove("content-length");
        } else {
            // Only set content-length if not using chunked encoding
            if let Ok(content_length) = new_body_bytes.len().to_string().parse() {
                headers.insert("content-length", content_length);
            }
        }

        // Replace the body with the modified content
        let new_body = Full::new(Bytes::from(new_body_bytes.to_vec()))
            .map_err(|e| anyhow::anyhow!("Body error: {}", e))
            .boxed();
        *response.body_mut() = Body::new(new_body);

        Ok(response)
    }
}

trait HtmlScriptInjectorExt {
    fn generate_content_tag(&self) -> String;
    fn inject_in_head(&self, html: &str, content_tag: &str) -> String;
    fn inject_in_body_start(&self, html: &str, content_tag: &str) -> String;
    fn inject_in_body_end(&self, html: &str, content_tag: &str) -> String;
    async fn decompress_gzip(&self, data: &Bytes) -> Result<Bytes>;
    async fn decompress_deflate(&self, data: &Bytes) -> Result<Bytes>;
    async fn decompress_brotli(&self, data: &Bytes) -> Result<Bytes>;
}

impl HtmlScriptInjectorExt for HtmlScriptInjectorConfig {
    fn generate_content_tag(&self) -> String {
        if self.content.is_none() {
            return String::new();
        }

        // Generate content tag if content is specified and not empty
        if let Some(ref content) = self.content {
            if !content.trim().is_empty() {
                return content.clone();
            }
        }

        String::new()
    }

    fn inject_in_head(&self, html: &str, content_tag: &str) -> String {
        // Try to inject before </head>
        if let Ok(re) = Regex::new(r"(?i)</head>") {
            if re.is_match(html) {
                return re
                    .replace(html, &format!("{}</head>", content_tag))
                    .to_string();
            }
        }

        // Fallback: inject after <head>
        if let Ok(re) = Regex::new(r"(?i)<head[^>]*>") {
            if re.is_match(html) {
                return re.replace(html, &format!("$0{}", content_tag)).to_string();
            }
        }

        // Last resort: inject at the beginning of HTML
        format!("{}{}", content_tag, html)
    }

    fn inject_in_body_start(&self, html: &str, content_tag: &str) -> String {
        // Try to inject after <body>
        if let Ok(re) = Regex::new(r"(?i)<body[^>]*>") {
            if re.is_match(html) {
                return re.replace(html, &format!("$0{}", content_tag)).to_string();
            }
        }

        // Fallback: inject at the beginning of HTML
        format!("{}{}", content_tag, html)
    }

    fn inject_in_body_end(&self, html: &str, content_tag: &str) -> String {
        // Try to inject before </body>
        if let Ok(re) = Regex::new(r"(?i)</body>") {
            if re.is_match(html) {
                return re
                    .replace(html, &format!("{}</body>", content_tag))
                    .to_string();
            }
        }

        // Fallback: inject at the end of HTML
        format!("{}{}", html, content_tag)
    }

    async fn decompress_gzip(&self, data: &Bytes) -> Result<Bytes> {
        let reader = BufReader::new(data.as_ref());
        let mut decoder = GzipDecoder::new(reader);
        let mut decompressed = Vec::new();
        decoder.read_to_end(&mut decompressed).await?;
        Ok(Bytes::from(decompressed))
    }

    async fn decompress_deflate(&self, data: &Bytes) -> Result<Bytes> {
        let reader = BufReader::new(data.as_ref());
        let mut decoder = DeflateDecoder::new(reader);
        let mut decompressed = Vec::new();
        decoder.read_to_end(&mut decompressed).await?;
        Ok(Bytes::from(decompressed))
    }

    async fn decompress_brotli(&self, data: &Bytes) -> Result<Bytes> {
        let reader = BufReader::new(data.as_ref());
        let mut decoder = BrotliDecoder::new(reader);
        let mut decompressed = Vec::new();
        decoder.read_to_end(&mut decompressed).await?;
        Ok(Bytes::from(decompressed))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{body::Body, response::Response};
    use http_body_util::Empty;

    fn create_test_response_with_html(html_content: &str) -> Response {
        let body_bytes = html_content.as_bytes().to_vec();
        let body = Full::new(Bytes::from(body_bytes))
            .map_err(|e| anyhow::anyhow!("Body error: {}", e))
            .boxed();

        Response::builder()
            .status(200)
            .header("content-type", "text/html; charset=utf-8")
            .header("content-length", html_content.len().to_string())
            .body(Body::new(body))
            .unwrap()
    }

    async fn create_test_response_with_compressed_html(
        html_content: &str,
        compression: &str,
    ) -> Result<Response> {
        use async_compression::tokio::write::{BrotliEncoder, DeflateEncoder, GzipEncoder};
        use tokio::io::AsyncWriteExt;

        let body_bytes = match compression {
            "gzip" => {
                let mut encoder = GzipEncoder::new(Vec::new());
                encoder.write_all(html_content.as_bytes()).await?;
                encoder.shutdown().await?;
                encoder.into_inner()
            }
            "deflate" => {
                let mut encoder = DeflateEncoder::new(Vec::new());
                encoder.write_all(html_content.as_bytes()).await?;
                encoder.shutdown().await?;
                encoder.into_inner()
            }
            "br" => {
                let mut encoder = BrotliEncoder::new(Vec::new());
                encoder.write_all(html_content.as_bytes()).await?;
                encoder.shutdown().await?;
                encoder.into_inner()
            }
            _ => html_content.as_bytes().to_vec(),
        };

        let body = Full::new(Bytes::from(body_bytes))
            .map_err(|e| anyhow::anyhow!("Body error: {}", e))
            .boxed();

        let mut builder = Response::builder()
            .status(200)
            .header("content-type", "text/html; charset=utf-8");

        if compression != "none" {
            builder = builder.header("content-encoding", compression);
        }

        Ok(builder.body(Body::new(body)).unwrap())
    }

    fn create_test_request() -> Req {
        http::Request::builder()
            .method("GET")
            .uri("http://example.com/test")
            .body(
                Empty::new()
                    .map_err(|e| anyhow::anyhow!("Body error: {}", e))
                    .boxed(),
            )
            .unwrap()
    }

    #[tokio::test]
    async fn test_inject_script_content_in_body_end() -> Result<()> {
        let html = "<html><head></head><body><h1>Test</h1></body></html>";
        let config = HtmlScriptInjectorConfig {
            content: Some("<script>console.log('injected');</script>".to_string()),
            injection_position: Some("body-end".to_string()),
        };

        let response = create_test_response_with_html(html);
        let mut result = config.handle_response(response).await?;

        // Read the modified body
        let body_bytes = http_body_util::BodyExt::collect(result.body_mut())
            .await?
            .to_bytes();
        let body_str = String::from_utf8(body_bytes.to_vec())?;

        assert!(body_str.contains("<script>console.log('injected');</script></body>"));
        Ok(())
    }

    #[tokio::test]
    async fn test_inject_script_src_in_head() -> Result<()> {
        let html = "<html><head><title>Test</title></head><body></body></html>";
        let config = HtmlScriptInjectorConfig {
            content: Some("<script src=\"https://example.com/script.js\"></script>".to_string()),
            injection_position: Some("head".to_string()),
        };

        let response = create_test_response_with_html(html);
        let mut result = config.handle_response(response).await?;

        // Read the modified body
        let body_bytes = http_body_util::BodyExt::collect(result.body_mut())
            .await?
            .to_bytes();
        let body_str = String::from_utf8(body_bytes.to_vec())?;

        assert!(
            body_str.contains("<script src=\"https://example.com/script.js\"></script></head>")
        );
        Ok(())
    }

    #[tokio::test]
    async fn test_script_with_attributes() -> Result<()> {
        let html = "<html><body></body></html>";

        let config = HtmlScriptInjectorConfig {
            content: Some(
                "<script async=\"true\" defer=\"defer\">console.log('test');</script>".to_string(),
            ),
            injection_position: Some("body-end".to_string()),
        };

        let response = create_test_response_with_html(html);
        let mut result = config.handle_response(response).await?;

        // Read the modified body
        let body_bytes = http_body_util::BodyExt::collect(result.body_mut())
            .await?
            .to_bytes();
        let body_str = String::from_utf8(body_bytes.to_vec())?;

        assert!(body_str.contains("async=\"true\""));
        assert!(body_str.contains("defer=\"defer\""));
        Ok(())
    }

    #[tokio::test]
    async fn test_non_html_response_skipped() -> Result<()> {
        let config = HtmlScriptInjectorConfig {
            content: Some("<script>console.log('injected');</script>".to_string()),
            injection_position: Some("body-end".to_string()),
        };

        let response = Response::builder()
            .status(200)
            .header("content-type", "application/json")
            .body(Body::empty())
            .unwrap();

        let result = config.handle_response(response).await?;

        // Should be unchanged
        assert_eq!(
            result.headers().get("content-type").unwrap(),
            "application/json"
        );
        Ok(())
    }

    #[tokio::test]
    async fn test_handle_request_passes_through() -> Result<()> {
        let config = HtmlScriptInjectorConfig::default();
        let request = create_test_request();
        let original_uri = request.uri().clone();
        let original_method = request.method().clone();

        let result = config.handle_request(request).await?;

        if let HandleRequestType::Request(req) = result {
            assert_eq!(req.uri(), &original_uri);
            assert_eq!(req.method(), &original_method);
        } else {
            panic!("Expected Request type, got Response");
        }

        Ok(())
    }

    #[tokio::test]
    async fn test_inject_script_with_gzip_compression() -> Result<()> {
        let html = "<html><head></head><body><h1>Test</h1></body></html>";
        let config = HtmlScriptInjectorConfig {
            content: Some("<script>console.log('injected');</script>".to_string()),
            injection_position: Some("body-end".to_string()),
        };

        let response = create_test_response_with_compressed_html(html, "gzip").await?;
        let mut result = config.handle_response(response).await?;

        // Check that content-encoding header is removed
        assert!(result.headers().get("content-encoding").is_none());

        // Read the modified body
        let body_bytes = http_body_util::BodyExt::collect(result.body_mut())
            .await?
            .to_bytes();
        let body_str = String::from_utf8(body_bytes.to_vec())?;

        assert!(body_str.contains("<script>console.log('injected');</script></body>"));
        Ok(())
    }

    #[tokio::test]
    async fn test_inject_script_with_deflate_compression() -> Result<()> {
        let html = "<html><head></head><body><h1>Test</h1></body></html>";
        let config = HtmlScriptInjectorConfig {
            content: Some("<script>console.log('deflate test');</script>".to_string()),
            injection_position: Some("body-end".to_string()),
        };

        let response = create_test_response_with_compressed_html(html, "deflate").await?;
        let mut result = config.handle_response(response).await?;

        // Check that content-encoding header is removed
        assert!(result.headers().get("content-encoding").is_none());

        // Read the modified body
        let body_bytes = http_body_util::BodyExt::collect(result.body_mut())
            .await?
            .to_bytes();
        let body_str = String::from_utf8(body_bytes.to_vec())?;

        assert!(body_str.contains("<script>console.log('deflate test');</script></body>"));
        Ok(())
    }

    #[tokio::test]
    async fn test_inject_script_with_brotli_compression() -> Result<()> {
        let html = "<html><head></head><body><h1>Test</h1></body></html>";
        let config = HtmlScriptInjectorConfig {
            content: Some("<script>console.log('brotli test');</script>".to_string()),
            injection_position: Some("body-end".to_string()),
        };

        let response = create_test_response_with_compressed_html(html, "br").await?;
        let mut result = config.handle_response(response).await?;

        // Check that content-encoding header is removed
        assert!(result.headers().get("content-encoding").is_none());

        // Read the modified body
        let body_bytes = http_body_util::BodyExt::collect(result.body_mut())
            .await?
            .to_bytes();
        let body_str = String::from_utf8(body_bytes.to_vec())?;

        assert!(body_str.contains("<script>console.log('brotli test');</script></body>"));
        Ok(())
    }

    #[tokio::test]
    async fn test_inject_html_content() -> Result<()> {
        let html = "<html><head></head><body><h1>Test</h1></body></html>";
        let config = HtmlScriptInjectorConfig {
            content: Some(
                "<script>console.log('test');</script><style>body { margin: 0; }</style>"
                    .to_string(),
            ),
            injection_position: Some("body-end".to_string()),
        };

        let response = create_test_response_with_html(html);
        let mut result = config.handle_response(response).await?;

        // Read the modified body
        let body_bytes = http_body_util::BodyExt::collect(result.body_mut())
            .await?
            .to_bytes();
        let body_str = String::from_utf8(body_bytes.to_vec())?;

        // Should contain both script and style tags
        assert!(body_str.contains("<script>console.log('test');</script>"));
        assert!(body_str.contains("<style>body { margin: 0; }</style>"));

        Ok(())
    }

    #[tokio::test]
    async fn test_empty_content_skipped() -> Result<()> {
        let html = "<html><body></body></html>";

        let config = HtmlScriptInjectorConfig {
            content: Some("   ".to_string()), // Only whitespace
            injection_position: Some("body-end".to_string()),
        };

        let response = create_test_response_with_html(html);
        let mut result = config.handle_response(response).await?;

        // Read the modified body
        let body_bytes = http_body_util::BodyExt::collect(result.body_mut())
            .await?
            .to_bytes();
        let body_str = String::from_utf8(body_bytes.to_vec())?;

        // Should be unchanged since content is empty
        assert_eq!(body_str, html);
        Ok(())
    }

    #[tokio::test]
    async fn test_transfer_encoding_chunked_removes_content_length() -> Result<()> {
        let html = "<html><body></body></html>";
        let config = HtmlScriptInjectorConfig {
            content: Some("<script>console.log('test');</script>".to_string()),
            injection_position: Some("body-end".to_string()),
        };

        // Create response with both transfer-encoding: chunked and content-length
        let body = Full::new(Bytes::from(html.as_bytes().to_vec()))
            .map_err(|e| anyhow::anyhow!("Body error: {}", e))
            .boxed();

        let response = Response::builder()
            .status(200)
            .header("content-type", "text/html; charset=utf-8")
            .header("content-length", html.len().to_string())
            .header("transfer-encoding", "chunked")
            .body(Body::new(body))
            .unwrap();

        let result = config.handle_response(response).await?;

        // Content-Length should be removed due to transfer-encoding: chunked
        assert!(result.headers().get("content-length").is_none());
        assert_eq!(
            result.headers().get("transfer-encoding").unwrap(),
            "chunked"
        );

        Ok(())
    }

    #[tokio::test]
    async fn test_content_length_kept_without_chunked_encoding() -> Result<()> {
        let html = "<html><body></body></html>";
        let config = HtmlScriptInjectorConfig {
            content: Some("<script>console.log('test');</script>".to_string()),
            injection_position: Some("body-end".to_string()),
        };

        let response = create_test_response_with_html(html);
        let result = config.handle_response(response).await?;

        // Content-Length should be present and updated
        assert!(result.headers().get("content-length").is_some());
        assert!(result.headers().get("transfer-encoding").is_none());

        Ok(())
    }
}
