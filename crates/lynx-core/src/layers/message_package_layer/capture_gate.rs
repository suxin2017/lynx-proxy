use anyhow::Result;
use axum::extract::Request;
use http::HeaderMap;
use http_body::Body as HttpBody;
use hyper_tungstenite::is_upgrade_request;
use lynx_dsl::{RequestFacts, compile_match_expr, eval_program};
use lynx_storage::dao::net_request_dao::{CaptureSwitchDao, RecordingStatus};
use lynx_storage::dao::capture_rules_dao::{CaptureRulesDao, CaptureRule};
use tracing::warn;

use crate::layers::extend_extension_layer::DataStoreExtensionsExt;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CaptureDecision {
    Capture,
    Bypass { reason: &'static str },
}

#[derive(Clone)]
pub struct CaptureGate;

impl CaptureGate {
    pub async fn decide<T: HttpBody>(request: &Request<T>) -> Result<CaptureDecision> {
        let store = request.extensions().get_data_store();

        let capture_dao = CaptureSwitchDao::new(store.clone());
        let capture_switch = capture_dao.get_capture_switch().await?;
        if !matches!(
            capture_switch.recording_status,
            RecordingStatus::StartRecording
        ) {
            return Ok(CaptureDecision::Bypass { reason: "recording_off" });
        }

        let rules_dao = CaptureRulesDao::new(store);
        let rules = rules_dao.get_rules().await?;

        let facts = request_facts_from_request(request);

        // 1) Ignore has absolute priority.
        if any_rule_matches(&rules.ignore_rules, &facts) {
            return Ok(CaptureDecision::Bypass { reason: "ignored" });
        }

        // 2) Focus is capture whitelist.
        let has_focus = rules.focus_rules.iter().any(|r| r.enabled);
        if has_focus && !any_rule_matches(&rules.focus_rules, &facts) {
            return Ok(CaptureDecision::Bypass {
                reason: "not_focused",
            });
        }

        Ok(CaptureDecision::Capture)
    }
}

fn any_rule_matches(rules: &[CaptureRule], facts: &RequestFacts) -> bool {
    for rule in rules {
        if !rule.enabled {
            continue;
        }
        let expr = rule.match_expr.trim();
        if expr.is_empty() {
            continue;
        }
        let program = match compile_match_expr(expr) {
            Ok(program) => program,
            Err(err) => {
                warn!("capture rule {} invalid DSL: {}", rule.id, err);
                continue;
            }
        };
        if eval_program(&program, facts) {
            return true;
        }
    }
    false
}

fn request_facts_from_request<T: HttpBody>(request: &Request<T>) -> RequestFacts {
    let uri = request.uri();
    let query = uri.query().map(|q| q.to_string());
    let path = uri.path().to_string();
    let method = request.method().as_str().to_string();

    let (host, port) = host_and_port(uri.host(), uri.port_u16(), request.headers());

    let scheme = uri.scheme_str().map(|s| s.to_string());
    let scheme = scheme_for_capture_facts(request, scheme, port);

    let mut builder = RequestFacts::builder();
    if let Some(scheme) = scheme {
        builder = builder.scheme(scheme);
    }
    builder = builder.host(host).path(path).method(method);
    if let Some(port) = port {
        builder = builder.port(port);
    }
    if let Some(query) = query {
        builder = builder.query(query);
    }
    for (name, value) in request.headers().iter() {
        let key = name.as_str();
        let val = value.to_str().unwrap_or_default();
        builder = builder.header(key, val);
    }
    builder.build()
}

fn scheme_for_capture_facts<T: HttpBody>(
    request: &Request<T>,
    scheme: Option<String>,
    port: Option<u16>,
) -> Option<String> {
    if !is_upgrade_request(request) {
        return scheme;
    }

    Some(match scheme.as_deref() {
        Some("https") | Some("wss") => "wss".to_string(),
        Some("http") | Some("ws") => "ws".to_string(),
        None if port == Some(443) => "wss".to_string(),
        None => "ws".to_string(),
        Some(other) => other.to_string(),
    })
}

fn host_and_port(
    uri_host: Option<&str>,
    uri_port: Option<u16>,
    headers: &HeaderMap,
) -> (String, Option<u16>) {
    if let Some(host) = uri_host {
        return (host.to_string(), uri_port);
    }

    let host_value = headers
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

