use anyhow::Result;
use axum::body::Body;
use axum::extract::Request;
use lynx_storage::dao::capture_rules_dao::{CaptureRule, CaptureRuleKind, CaptureRulesDao};
use lynx_storage::DataStore;
use tempfile::TempDir;

use lynx_core::layers::message_package_layer::capture_gate::{CaptureDecision, CaptureGate};

async fn setup_store() -> (std::sync::Arc<DataStore>, TempDir) {
    let dir = tempfile::tempdir().unwrap();
    let store = DataStore::new(dir.path()).await.unwrap();
    (store, dir)
}

fn req_with_store(url: &str, store: std::sync::Arc<DataStore>) -> Request<Body> {
    let mut req = Request::builder()
        .method("GET")
        .uri(url)
        .body(Body::empty())
        .unwrap();
    req.extensions_mut().insert(store);
    req
}

#[tokio::test]
async fn capture_gate_focus_whitelist_bypasses_unfocused() -> Result<()> {
    let (store, _dir) = setup_store().await;
    let dao = CaptureRulesDao::new(store.clone());

    // Enable a focus rule that does NOT match the request.
    dao.upsert(
        CaptureRuleKind::Focus,
        CaptureRule {
            id: 0,
            name: "focus-other".to_string(),
            enabled: true,
            match_expr: "other.example.com".to_string(),
            created_at: 0,
            updated_at: 0,
        },
    )
    .await?;

    let req = req_with_store("http://example.com/hello", store);
    let decision = CaptureGate::decide(&req).await?;
    assert!(matches!(decision, CaptureDecision::Bypass { .. }));
    Ok(())
}

#[tokio::test]
async fn capture_gate_ignore_overrides_focus() -> Result<()> {
    let (store, _dir) = setup_store().await;
    let dao = CaptureRulesDao::new(store.clone());

    // Focus matches...
    dao.upsert(
        CaptureRuleKind::Focus,
        CaptureRule {
            id: 0,
            name: "focus-example".to_string(),
            enabled: true,
            match_expr: "example.com".to_string(),
            created_at: 0,
            updated_at: 0,
        },
    )
    .await?;

    // ...but ignore should win.
    dao.upsert(
        CaptureRuleKind::Ignore,
        CaptureRule {
            id: 0,
            name: "ignore-example".to_string(),
            enabled: true,
            match_expr: "example.com/hello".to_string(),
            created_at: 0,
            updated_at: 0,
        },
    )
    .await?;

    let req = req_with_store("http://example.com/hello", store);
    let decision = CaptureGate::decide(&req).await?;
    assert!(matches!(decision, CaptureDecision::Bypass { reason: "ignored" }));
    Ok(())
}

