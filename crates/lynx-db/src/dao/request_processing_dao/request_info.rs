use super::common::{HeaderUtils, HttpMessage};
use anyhow::Result;
use axum::{body::Bytes, extract::Request};
use http_body_util::BodyExt;
use std::collections::HashMap;

/// Request information for matching
#[derive(Debug, Clone)]
pub struct RequestInfo {
    pub url: String,
    pub method: String,
    pub host: String,
    pub headers: HashMap<String, String>,
    pub body: Bytes,
}

impl RequestInfo {
    /// Create RequestInfo from axum Request
    pub async fn from_axum_request(mut req: Request<axum::body::Body>) -> Result<Self> {
        let url = req.uri().to_string();
        let method = req.method().to_string();
        let host = req
            .headers()
            .get("host")
            .and_then(|h| h.to_str().ok())
            .unwrap_or_default()
            .to_string();

        let headers = HeaderUtils::extract_headers(req.headers());

        let body = req.body_mut().collect().await?;
        Ok(RequestInfo {
            url,
            method,
            host,
            headers,
            body: body.to_bytes(),
        })
    }

    /// Get request body as string (delegates to HttpMessage trait)
    pub fn body_as_string(&self) -> Result<String> {
        HttpMessage::body_as_string(self)
    }

    /// Get request body as JSON (delegates to HttpMessage trait)
    pub fn body_as_json<T: for<'de> serde::Deserialize<'de>>(&self) -> Result<T> {
        HttpMessage::body_as_json(self)
    }

    /// Get the size of the request body in bytes (delegates to HttpMessage trait)
    pub fn body_size(&self) -> usize {
        HttpMessage::body_size(self)
    }

    /// Check if request body is empty (delegates to HttpMessage trait)
    pub fn is_body_empty(&self) -> bool {
        HttpMessage::is_body_empty(self)
    }

    /// Get a specific header value (delegates to HttpMessage trait)
    pub fn get_header(&self, name: &str) -> Option<&String> {
        HttpMessage::get_header(self, name)
    }

    /// Check if request content is JSON (delegates to HttpMessage trait)
    pub fn is_json(&self) -> bool {
        HttpMessage::is_json(self)
    }

    /// Check if request content is HTML (delegates to HttpMessage trait)
    pub fn is_html(&self) -> bool {
        HttpMessage::is_html(self)
    }

    /// Check if request content is plain text (delegates to HttpMessage trait)
    pub fn is_text(&self) -> bool {
        HttpMessage::is_text(self)
    }
}

impl HttpMessage for RequestInfo {
    fn headers(&self) -> &HashMap<String, String> {
        &self.headers
    }

    fn body_data(&self) -> &[u8] {
        &self.body
    }
}
