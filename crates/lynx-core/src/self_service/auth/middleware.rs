use axum::http::{HeaderMap, Method, StatusCode, Uri, header};
use axum::response::{IntoResponse, Response};
use serde_json::json;

use super::AuthConfig;

const PUBLIC_PATHS: &[(&Method, &str)] = &[
    (&Method::GET, "/api/health"),
    (&Method::GET, "/api/auth/status"),
    (&Method::POST, "/api/auth/login"),
    (&Method::GET, "/api/base_info/address"),
];

pub fn is_public_http_path(method: &Method, path: &str) -> bool {
    PUBLIC_PATHS.iter().any(|(m, p)| m == method && *p == path)
}

pub fn extract_bearer_token(headers: &HeaderMap) -> Option<String> {
    headers
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
        .map(str::trim)
        .filter(|token| !token.is_empty())
        .map(ToOwned::to_owned)
}

pub fn extract_ws_token(uri: &Uri, headers: &HeaderMap) -> Option<String> {
    if let Some(token) = extract_bearer_token(headers) {
        return Some(token);
    }

    uri.query().and_then(parse_token_query)
}

fn parse_token_query(query: &str) -> Option<String> {
    query.split('&').find_map(|pair| {
        let mut parts = pair.splitn(2, '=');
        let key = parts.next()?;
        if key != "token" {
            return None;
        }
        let value = parts.next()?.trim();
        if value.is_empty() {
            return None;
        }
        Some(value.to_string())
    })
}

pub fn authorize_http(
    auth: &AuthConfig,
    method: &Method,
    path: &str,
    uri: &Uri,
    headers: &HeaderMap,
) -> bool {
    if !auth.enabled || is_public_http_path(method, path) {
        return true;
    }

    let token = extract_bearer_token(headers).or_else(|| uri.query().and_then(parse_token_query));

    let Some(token) = token else {
        return false;
    };

    auth.validate_token(&token).is_ok()
}

pub fn authorize_ws(auth: &AuthConfig, uri: &Uri, headers: &HeaderMap) -> bool {
    if !auth.enabled {
        return true;
    }

    let Some(token) = extract_ws_token(uri, headers) else {
        return false;
    };

    auth.validate_token(&token).is_ok()
}

pub fn unauthorized_response() -> Response {
    (
        StatusCode::UNAUTHORIZED,
        [(header::CONTENT_TYPE, "application/json")],
        json!({ "error": "unauthorized" }).to_string(),
    )
        .into_response()
}
