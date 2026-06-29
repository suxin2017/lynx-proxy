//! Query string parsing and subset matching for DSL rules.

use std::collections::HashMap;
use std::sync::Arc;

/// Parse `a=1&b=2` into key/value pairs. Keys without `=` map to an empty value.
pub fn parse_query_pairs(query: &str) -> Vec<(String, String)> {
    if query.is_empty() {
        return Vec::new();
    }
    query
        .split('&')
        .filter(|segment| !segment.is_empty())
        .map(|segment| {
            if let Some((key, value)) = segment.split_once('=') {
                (key.to_string(), value.to_string())
            } else {
                (segment.to_string(), String::new())
            }
        })
        .collect()
}

/// Subset match: every expected pair must appear in the actual query (extra params allowed).
pub fn query_params_subset_match(expected: &[(Arc<str>, Arc<str>)], actual: Option<&str>) -> bool {
    if expected.is_empty() {
        return actual.map(str::is_empty).unwrap_or(true);
    }
    let Some(actual) = actual else {
        return false;
    };
    let actual_map: HashMap<String, String> = parse_query_pairs(actual).into_iter().collect();
    expected.iter().all(|(key, value)| {
        actual_map
            .get(key.as_ref())
            .is_some_and(|actual| actual.as_str() == value.as_ref())
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_pairs() {
        assert_eq!(
            parse_query_pairs("a=1&b=2"),
            vec![
                ("a".to_string(), "1".to_string()),
                ("b".to_string(), "2".to_string())
            ]
        );
    }

    #[test]
    fn subset_allows_extra_params() {
        let expected = vec![
            (Arc::from("operationName"), Arc::from("GetFeed")),
            (Arc::from("platform"), Arc::from("android")),
        ];
        assert!(query_params_subset_match(
            &expected,
            Some("operationName=GetFeed&platform=android&sign=abc"),
        ));
    }
}
