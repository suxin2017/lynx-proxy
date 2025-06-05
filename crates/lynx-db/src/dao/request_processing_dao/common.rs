use anyhow::Result;
use axum::body::Bytes;
use http::HeaderMap;
use serde::Serialize;
use std::collections::HashMap;

/// Common utilities for header processing
pub struct HeaderUtils;

impl HeaderUtils {
    /// Extract headers from HeaderMap to HashMap
    pub fn extract_headers(header_map: &HeaderMap) -> HashMap<String, String> {
        header_map
            .iter()
            .filter_map(|(name, value)| {
                value
                    .to_str()
                    .ok()
                    .map(|v| (name.to_string(), v.to_string()))
            })
            .collect()
    }

    /// Extract a specific header value from HeaderMap
    pub fn extract_header_value(header_map: &HeaderMap, name: &str) -> Option<String> {
        header_map
            .get(name)
            .and_then(|value| value.to_str().ok())
            .map(|s| s.to_string())
    }

    /// Extract content type from HeaderMap
    pub fn extract_content_type(header_map: &HeaderMap) -> Option<String> {
        Self::extract_header_value(header_map, "content-type")
    }

    /// Extract content length from HeaderMap
    pub fn extract_content_length(header_map: &HeaderMap) -> Option<u64> {
        Self::extract_header_value(header_map, "content-length")
            .and_then(|value| value.parse().ok())
    }
}

/// Common utilities for body processing
pub struct BodyUtils;

impl BodyUtils {
    /// Convert Bytes to Vec<u8>
    pub fn bytes_to_vec(bytes: &Bytes) -> Vec<u8> {
        bytes.to_vec()
    }

    /// Convert Vec<u8> to Bytes
    pub fn vec_to_bytes(vec: Vec<u8>) -> Bytes {
        Bytes::from(vec)
    }

    /// Check if body content appears to be binary
    pub fn is_binary_content(data: &[u8]) -> bool {
        // Simple heuristic: if more than 10% of bytes are non-printable, consider it binary
        if data.is_empty() {
            return false;
        }

        let non_printable_count = data
            .iter()
            .filter(|&&byte| byte < 32 && byte != 9 && byte != 10 && byte != 13)
            .count();

        (non_printable_count as f64 / data.len() as f64) > 0.1
    }

    /// Truncate body content for logging/display purposes
    pub fn truncate_for_display(data: &[u8], max_length: usize) -> String {
        if Self::is_binary_content(data) {
            format!("[Binary data, {} bytes]", data.len())
        } else {
            let content = String::from_utf8_lossy(data);
            if content.len() > max_length {
                format!(
                    "{}... [truncated, total {} bytes]",
                    &content[..max_length],
                    data.len()
                )
            } else {
                content.to_string()
            }
        }
    }

    /// Create a JSON body from serializable data
    pub fn create_json_body<T: Serialize>(data: &T) -> Result<Vec<u8>> {
        Ok(serde_json::to_vec(data)?)
    }

    /// Create headers for JSON content
    pub fn create_json_headers() -> HashMap<String, String> {
        let mut headers = HashMap::new();
        headers.insert("content-type".to_string(), "application/json".to_string());
        headers
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use http::{HeaderMap, HeaderValue};

    #[test]
    fn test_header_utils() {
        let mut header_map = HeaderMap::new();
        header_map.insert("content-type", HeaderValue::from_static("application/json"));
        header_map.insert("content-length", HeaderValue::from_static("100"));

        let headers = HeaderUtils::extract_headers(&header_map);
        assert_eq!(
            headers.get("content-type"),
            Some(&"application/json".to_string())
        );
        assert_eq!(headers.get("content-length"), Some(&"100".to_string()));

        let content_type = HeaderUtils::extract_content_type(&header_map);
        assert_eq!(content_type, Some("application/json".to_string()));

        let content_length = HeaderUtils::extract_content_length(&header_map);
        assert_eq!(content_length, Some(100));
    }

    #[test]
    fn test_body_utils() {
        let data = b"Hello, world!";
        assert!(!BodyUtils::is_binary_content(data));

        let binary_data = vec![0u8, 1, 2, 255, 254];
        assert!(BodyUtils::is_binary_content(&binary_data));

        let display = BodyUtils::truncate_for_display(b"Hello, world!", 5);
        assert_eq!(display, "Hello... [truncated, total 13 bytes]");

        let binary_display = BodyUtils::truncate_for_display(&binary_data, 100);
        assert_eq!(binary_display, "[Binary data, 5 bytes]");
    }
}
