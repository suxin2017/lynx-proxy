use http::{HeaderMap, HeaderValue, Method, Request};
use lynx_dsl::{compile_match_expr, eval_program, RequestFacts};

/// Real-world style tests: build an `http::Request` (absolute URI, query, headers),
/// then derive `RequestFacts` and evaluate the compiled IR.
///
/// Keep adding production-like scenarios here as the DSL grows.

#[test]
fn matches_real_http_request_shape_with_query_and_headers() {
    // Simulate a real request coming from the proxy pipeline:
    // - absolute URI (scheme/host/port)
    // - path + query (query should not affect path matching)
    // - common headers
    let mut headers = HeaderMap::new();
    headers.insert("authorization", HeaderValue::from_static("Bearer"));
    headers.insert("x-token", HeaderValue::from_static("abc"));

    let request: Request<()> = Request::builder()
        .method(Method::POST)
        .uri("https://example.com:443/api/v1/events/track?x=1&y=2")
        .body(())
        .unwrap();

    let facts = facts_from_http_request(&request, &headers);
    let program = compile_match_expr(
        "example.com AND /api/v1/events/track AND -X POST AND --header authorization=Bearer",
    )
    .unwrap();

    assert!(
        eval_program(&program, &facts),
        "expected match for facts derived from real http::Request"
    );
}

#[test]
fn query_string_does_not_affect_path_matching() {
    let request: Request<()> = Request::builder()
        .method(Method::GET)
        .uri("https://example.com/api?foo=bar")
        .body(())
        .unwrap();

    let facts = facts_from_http_request(&request, &HeaderMap::new());
    let program = compile_match_expr("example.com AND /api").unwrap();
    assert!(eval_program(&program, &facts));
}

#[test]
fn origin_form_uri_uses_host_header() {
    // Many real HTTP/1.1 requests are origin-form (no scheme/authority in the URI),
    // with host/port coming from the Host header.
    let mut headers = HeaderMap::new();
    headers.insert("host", HeaderValue::from_static("example.com:443"));
    headers.insert("authorization", HeaderValue::from_static("Bearer"));

    let request: Request<()> = Request::builder()
        .method(Method::GET)
        .uri("/api/v1/users?debug=1")
        .body(())
        .unwrap();

    let facts = facts_from_http_request(&request, &headers);
    let program = compile_match_expr("example.com AND /api/v1/users AND --header authorization=Bearer").unwrap();
    assert!(eval_program(&program, &facts));
}

#[test]
fn websocket_scheme_and_port_match() {
    let request: Request<()> = Request::builder()
        .method(Method::GET)
        .uri("ws://example.com:8080/status?x=1")
        .body(())
        .unwrap();

    let facts = facts_from_http_request(&request, &HeaderMap::new());
    let program = compile_match_expr("ws://example.com:8080/status").unwrap();
    assert!(eval_program(&program, &facts));
}

#[test]
fn header_name_case_is_ignored() {
    let mut headers = HeaderMap::new();
    headers.insert("X-ToKeN", HeaderValue::from_static("abc"));

    let request: Request<()> = Request::builder()
        .method(Method::GET)
        .uri("https://example.com/api")
        .body(())
        .unwrap();

    let facts = facts_from_http_request(&request, &headers);
    let program = compile_match_expr("example.com AND /api AND -h x-token=abc").unwrap();
    assert!(eval_program(&program, &facts));
}

#[test]
fn literal_path_prefix_matching_in_real_request() {
    // Our semantics: a literal path like `/api` matches `/api` and any deeper path below it.
    let request: Request<()> = Request::builder()
        .method(Method::GET)
        .uri("https://example.com/api/v1/events/track")
        .body(())
        .unwrap();

    let facts = facts_from_http_request(&request, &HeaderMap::new());
    let program = compile_match_expr("example.com AND /api").unwrap();
    assert!(eval_program(&program, &facts));
}

#[test]
fn url_embedded_query_matches_real_request() {
    let request: Request<()> = Request::builder()
        .method(Method::GET)
        .uri("https://example.com/v1/graphql?operationName=GetFeed&platform=android&sign=abc")
        .body(())
        .unwrap();

    let facts = facts_from_http_request(&request, &HeaderMap::new());
    let program = compile_match_expr(
        "example.com/v1/graphql?operationName=GetFeed&platform=android",
    )
    .unwrap();
    assert!(eval_program(&program, &facts));
}

#[test]
fn query_flag_matches_query_string() {
    let request: Request<()> = Request::builder()
        .method(Method::GET)
        .uri("https://example.com/api?foo=bar&x=1")
        .body(())
        .unwrap();

    let facts = facts_from_http_request(&request, &HeaderMap::new());
    let program = compile_match_expr("example.com AND /api AND --query foo=bar").unwrap();
    assert!(eval_program(&program, &facts));
}

#[test]
fn query_flag_does_not_match_when_missing() {
    let request: Request<()> = Request::builder()
        .method(Method::GET)
        .uri("https://example.com/api?foo=bar")
        .body(())
        .unwrap();

    let facts = facts_from_http_request(&request, &HeaderMap::new());
    let program = compile_match_expr("example.com AND /api AND -q x=1").unwrap();
    assert!(!eval_program(&program, &facts));
}

#[test]
fn example_and_not_star_slash_api_on_two_real_urls() {
    // NOTE: our current path-glob semantics are segment-based:
    // - `*/api` matches `/x/api` (two segments), but does NOT match `/api` (one segment).
    // If you want to exclude `/api` and anything under it, prefer `NOT /api`.

    let dsl = "example.com AND NOT */api";

    let req_api: Request<()> = Request::builder()
        .method(Method::GET)
        .uri("https://example.com/api?foo=bar")
        .body(())
        .unwrap();
    let facts_api = facts_from_http_request(&req_api, &HeaderMap::new());
    let program = compile_match_expr(dsl).unwrap();
    assert!(
        eval_program(&program, &facts_api),
        "by current semantics, */api does not match /api so NOT */api is true"
    );

    let req_html: Request<()> = Request::builder()
        .method(Method::GET)
        .uri("https://example.com/a.html")
        .body(())
        .unwrap();
    let facts_html = facts_from_http_request(&req_html, &HeaderMap::new());
    assert!(eval_program(&program, &facts_html));
}

fn facts_from_http_request<T>(request: &Request<T>, extra_headers: &HeaderMap) -> RequestFacts {
    let uri = request.uri();
    let scheme = uri.scheme_str().map(|s| s.to_string());
    let (host, port) = host_and_port_from_request(uri.host(), uri.port_u16(), extra_headers);
    let path = uri.path().to_string();
    let query = uri.query().map(|value| value.to_string());
    let method = request.method().as_str().to_string();

    let mut headers: Vec<(String, String)> = Vec::new();
    for (name, value) in extra_headers.iter() {
        let key = name.as_str().to_ascii_lowercase();
        let val = value.to_str().unwrap_or_default().to_string();
        headers.push((key, val));
    }
    headers.sort_by(|(l, _), (r, _)| l.cmp(r));

    RequestFacts {
        scheme,
        host,
        port,
        path,
        query,
        method,
        headers,
    }
}

fn host_and_port_from_request(
    uri_host: Option<&str>,
    uri_port: Option<u16>,
    extra_headers: &HeaderMap,
) -> (String, Option<u16>) {
    if let Some(host) = uri_host {
        return (host.to_string(), uri_port);
    }

    // Fallback to Host header for origin-form URIs.
    let host_value = extra_headers
        .get("host")
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default();

    if let Some((host, port)) = host_value.rsplit_once(':') {
        if let Ok(port) = port.parse::<u16>() {
            return (host.to_string(), Some(port));
        }
    }

    (host_value.to_string(), None)
}

