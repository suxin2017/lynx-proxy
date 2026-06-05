use std::time::{Duration, Instant};

use anyhow::{Result, anyhow};
use reqwest::header::{HeaderName, HeaderValue};
use serde::{Deserialize, Serialize};
use url::Url;

use crate::self_service::RouteState;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum ComposeHttpMethod {
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Head,
    Options,
}

impl ComposeHttpMethod {
    fn as_reqwest_method(&self) -> reqwest::Method {
        match self {
            ComposeHttpMethod::Get => reqwest::Method::GET,
            ComposeHttpMethod::Post => reqwest::Method::POST,
            ComposeHttpMethod::Put => reqwest::Method::PUT,
            ComposeHttpMethod::Patch => reqwest::Method::PATCH,
            ComposeHttpMethod::Delete => reqwest::Method::DELETE,
            ComposeHttpMethod::Head => reqwest::Method::HEAD,
            ComposeHttpMethod::Options => reqwest::Method::OPTIONS,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyValueRow {
    pub key: String,
    pub value: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComposeRequestPayload {
    pub method: ComposeHttpMethod,
    pub url: String,
    #[serde(default)]
    pub query_params: Vec<KeyValueRow>,
    #[serde(default)]
    pub headers: Vec<KeyValueRow>,
    #[serde(default)]
    pub body: String,
    /// Timeout in seconds (matches UI draft default: 30).
    pub timeout: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComposeResponsePayload {
    pub status: u16,
    pub status_text: String,
    pub headers: std::collections::BTreeMap<String, String>,
    pub body: String,
    pub response_time: u128,
    pub size: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_message: Option<String>,
}

fn normalize_and_apply_query(mut url: Url, query_params: &[KeyValueRow]) -> Url {
    if query_params.is_empty() {
        return url;
    }

    // Address bar already carries the query (signed URLs, cURL import). Params are UI-only.
    if url.query().is_some() {
        return url;
    }

    url.set_query(None);

    {
        let mut pairs = url.query_pairs_mut();
        for row in query_params {
            if !row.enabled {
                continue;
            }
            let key = row.key.trim();
            if key.is_empty() {
                continue;
            }
            pairs.append_pair(key, row.value.as_str());
        }
    }

    url
}

fn has_enabled_query_params(query_params: &[KeyValueRow]) -> bool {
    query_params
        .iter()
        .any(|row| row.enabled && !row.key.trim().is_empty())
}

/// Keep signed/pre-encoded query strings verbatim; only merge Params when the bar has no `?`.
fn compose_request_url(payload: &ComposeRequestPayload) -> Result<String> {
    let raw = payload.url.trim();
    if raw.is_empty() {
        return Err(anyhow!("url is empty"));
    }

    if has_enabled_query_params(&payload.query_params) && !raw.contains('?') {
        let parsed = Url::parse(raw).map_err(|e| anyhow!("invalid url '{raw}': {e}"))?;
        return Ok(normalize_and_apply_query(parsed, &payload.query_params).to_string());
    }

    Ok(raw.to_string())
}

const SKIP_COMPOSE_HEADERS: &[&str] = &[
    "host",
    "connection",
    "content-length",
    "transfer-encoding",
    "accept-encoding",
];

fn apply_headers(
    mut builder: reqwest::RequestBuilder,
    headers: &[KeyValueRow],
) -> Result<reqwest::RequestBuilder> {
    for row in headers {
        if !row.enabled {
            continue;
        }
        let key = row.key.trim();
        if key.is_empty() {
            continue;
        }
        if SKIP_COMPOSE_HEADERS
            .iter()
            .any(|skip| skip.eq_ignore_ascii_case(key))
        {
            continue;
        }
        let name = HeaderName::from_bytes(key.as_bytes())
            .map_err(|e| anyhow!("invalid header name '{key}': {e}"))?;
        let value = HeaderValue::from_str(row.value.as_str())
            .map_err(|e| anyhow!("invalid header value for '{key}': {e}"))?;
        builder = builder.header(name, value);
    }
    Ok(builder)
}

fn map_headers(headers: &reqwest::header::HeaderMap) -> std::collections::BTreeMap<String, String> {
    let mut out = std::collections::BTreeMap::<String, String>::new();
    for (name, value) in headers.iter() {
        let key = name.as_str().to_string();
        let val = value.to_str().unwrap_or_default().to_string();
        out.entry(key)
            .and_modify(|existing| {
                if !existing.is_empty() {
                    existing.push_str(", ");
                }
                existing.push_str(&val);
            })
            .or_insert(val);
    }
    out
}

pub async fn execute_compose_request(
    state: &RouteState,
    payload: ComposeRequestPayload,
) -> Result<ComposeResponsePayload> {
    let start = Instant::now();

    let url = compose_request_url(&payload)?;

    let mut builder = state
        .client
        .client()
        .request(payload.method.as_reqwest_method(), url);

    builder = apply_headers(builder, &payload.headers)?;

    if let Some(timeout_secs) = payload.timeout {
        if timeout_secs > 0 {
            builder = builder.timeout(Duration::from_secs(timeout_secs));
        }
    }

    if !payload.body.is_empty()
        && !matches!(payload.method, ComposeHttpMethod::Get | ComposeHttpMethod::Head)
    {
        // Send the body exactly as edited (cURL / Postman parity); do not re-serialize JSON.
        builder = builder.body(payload.body);
    }

    let response = builder.send().await;
    let elapsed = start.elapsed();

    match response {
        Ok(res) => {
            let status = res.status();
            let status_text = status.canonical_reason().unwrap_or("").to_string();
            let headers = map_headers(res.headers());

            let bytes = res.bytes().await.unwrap_or_default();
            let size = bytes.len();
            let body = String::from_utf8_lossy(bytes.as_ref()).to_string();

            Ok(ComposeResponsePayload {
                status: status.as_u16(),
                status_text,
                headers,
                body,
                response_time: elapsed.as_millis(),
                size,
                error_message: None,
            })
        }
        Err(err) => Ok(ComposeResponsePayload {
            status: 0,
            status_text: String::new(),
            headers: Default::default(),
            body: String::new(),
            response_time: elapsed.as_millis(),
            size: 0,
            error_message: Some(err.to_string()),
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn query_params_apply_when_url_has_no_query() {
        let url = Url::parse("https://example.com/path").expect("url");
        let rows = vec![
            KeyValueRow {
                key: "sig".into(),
                value: "only".into(),
                enabled: true,
            },
            KeyValueRow {
                key: "token".into(),
                value: "1".into(),
                enabled: true,
            },
        ];
        let out = normalize_and_apply_query(url, &rows);
        let pairs: Vec<(String, String)> = out.query_pairs().into_owned().collect();
        assert_eq!(
            pairs,
            vec![
                ("sig".to_string(), "only".to_string()),
                ("token".to_string(), "1".to_string()),
            ]
        );
    }

    #[test]
    fn compose_request_url_keeps_encoded_query_verbatim() {
        let raw = "https://example.com/path?adExtInfo=%7B%22a%22%3A1%7D&sig=x+y";
        let payload = ComposeRequestPayload {
            method: ComposeHttpMethod::Post,
            url: raw.into(),
            query_params: vec![KeyValueRow {
                key: "sig".into(),
                value: "other".into(),
                enabled: true,
            }],
            headers: vec![],
            body: String::new(),
            timeout: None,
        };
        assert_eq!(compose_request_url(&payload).expect("url"), raw);
    }

    #[test]
    fn query_params_skipped_when_url_already_has_query() {
        let url = Url::parse("https://example.com/path?sig=signed").expect("url");
        let rows = vec![KeyValueRow {
            key: "sig".into(),
            value: "rebuilt".into(),
            enabled: true,
        }];
        let out = normalize_and_apply_query(url, &rows);
        assert_eq!(out.query(), Some("sig=signed"));
    }
}
