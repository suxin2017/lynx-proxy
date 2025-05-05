use http::HeaderMap;
use serde_json::Value;

/// Get headers and their size from a HeaderMap
pub fn get_header_and_size(header_map: &HeaderMap) -> (Value, usize) {
    let headers = header_map
        .iter()
        .map(|(k, v)| (k.as_str().to_string(), v.to_str().unwrap_or("").to_string()))
        .collect();
    let header_size: usize = header_map
        .iter()
        .map(|(k, v)| k.as_str().len() + v.as_bytes().len())
        .sum();
    (headers, header_size)
}
