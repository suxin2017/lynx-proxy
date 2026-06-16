//! End-to-end acceptance tests for `lynx rules push/pull/apply`.
//!
//! Semantics (git-like):
//! - `rules pull`: `.lynx.json` -> local data-dir (import / upsert)
//! - `rules push`: local data-dir -> `.lynx.json` (export / merge)

use std::process::Command;

use anyhow::Result;
use lynx_storage::dao::request_processing_dao::{
    CaptureRule, HandlerRule, RequestProcessingDao, RequestRule,
};
use lynx_storage::project_config::read_project_config;
use lynx_storage::DataStore;
use tempfile::tempdir;

fn lynx_bin() -> Command {
    Command::new(env!("CARGO_BIN_EXE_lynx"))
}

#[tokio::test]
async fn cli_rules_push_pull_apply_acceptance() -> Result<()> {
    let project = tempdir()?;
    let data = tempdir()?;
    let config_path = project.path().join("lynx.json");
    let data_dir = data.path().to_string_lossy().to_string();

    let store = DataStore::new(data.path()).await?;
    let dao = RequestProcessingDao::new(store.clone());

    let mut enabled_rule = RequestRule::default();
    enabled_rule.name = "enabled-rule".to_string();
    enabled_rule.priority = 50;
    enabled_rule.capture = CaptureRule {
        id: None,
        match_expr: "enabled.example.com".to_string(),
    };
    enabled_rule.handlers = vec![HandlerRule::block_handler(Some(404), None)];
    enabled_rule.enabled = true;
    dao.create_rule(enabled_rule).await?;

    let mut orphan = RequestRule::default();
    orphan.name = "orphan-rule".to_string();
    orphan.priority = 50;
    orphan.capture = CaptureRule {
        id: None,
        match_expr: "orphan.example.com".to_string(),
    };
    orphan.handlers = vec![HandlerRule::block_handler(Some(404), None)];
    orphan.enabled = true;
    dao.create_rule(orphan).await?;

    let push = lynx_bin()
        .args([
            "rules",
            "push",
            "--file",
            config_path.to_str().unwrap(),
            "--data-dir",
            &data_dir,
        ])
        .current_dir(project.path())
        .output()?;
    assert!(
        push.status.success(),
        "push failed: {}",
        String::from_utf8_lossy(&push.stderr)
    );
    assert!(config_path.exists());

    let exported = read_project_config(&config_path).await?;
    assert_eq!(exported.rules.len(), 2);
    assert!(!exported.config_id.is_empty());
    assert_eq!(exported.project, "default");
    assert!(exported.rules.iter().all(|rule| rule.id > 0));
    let exported_json = std::fs::read_to_string(&config_path)?;
    assert!(!exported_json.contains("contentHash"));

    let pull = lynx_bin()
        .args([
            "rules",
            "pull",
            "--file",
            config_path.to_str().unwrap(),
            "--data-dir",
            &data_dir,
        ])
        .current_dir(project.path())
        .output()?;
    assert!(
        pull.status.success(),
        "pull failed: {}",
        String::from_utf8_lossy(&pull.stderr)
    );

    let mut config = read_project_config(&config_path).await?;
    config.rules.retain(|r| r.name == "enabled-rule");
    for rule in &mut config.rules {
        rule.enabled = false;
    }
    lynx_storage::storage::write_json_atomic(&config_path, &config).await?;

    let apply = lynx_bin()
        .args([
            "rules",
            "apply",
            "--file",
            config_path.to_str().unwrap(),
            "--data-dir",
            &data_dir,
        ])
        .current_dir(project.path())
        .output()?;
    assert!(
        apply.status.success(),
        "apply failed: {}",
        String::from_utf8_lossy(&apply.stderr)
    );
    let apply_out = String::from_utf8_lossy(&apply.stdout);
    assert!(apply_out.contains("Disabled:"));

    let rules = dao.list_rules().await?;
    let enabled_rule = rules.iter().find(|r| r.name == "enabled-rule").unwrap();
    let orphan_rule = rules.iter().find(|r| r.name == "orphan-rule").unwrap();
    assert!(!enabled_rule.enabled);
    assert!(!orphan_rule.enabled);
    assert_eq!(rules.len(), 2);

    Ok(())
}

#[tokio::test]
async fn cli_rules_push_creates_default_project_config() -> Result<()> {
    let project = tempdir()?;
    let data = tempdir()?;
    let config_path = project.path().join(".lynx.json");

    let output = lynx_bin()
        .args([
            "rules",
            "push",
            "--data-dir",
            &data.path().to_string_lossy(),
        ])
        .current_dir(project.path())
        .output()?;
    assert!(
        output.status.success(),
        "push failed: {}",
        String::from_utf8_lossy(&output.stderr)
    );

    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(stdout.contains("Created"));
    assert_eq!(config_path, project.path().join(".lynx.json"));

    let config = read_project_config(&config_path).await?;
    assert_eq!(config.project, "default");
    assert!(config.rules.is_empty());
    Ok(())
}

#[tokio::test]
async fn cli_rules_pull_creates_missing_config() -> Result<()> {
    let project = tempdir()?;
    let data = tempdir()?;
    let config_path = project.path().join(".lynx.json");

    let output = lynx_bin()
        .args([
            "rules",
            "pull",
            "--data-dir",
            &data.path().to_string_lossy(),
        ])
        .current_dir(project.path())
        .output()?;
    assert!(
        output.status.success(),
        "pull failed: {}",
        String::from_utf8_lossy(&output.stderr)
    );

    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(stdout.contains("Created"));
    assert!(config_path.exists());

    let config = read_project_config(&config_path).await?;
    assert_eq!(config.project, "default");
    assert!(config.rules.is_empty());
    Ok(())
}
