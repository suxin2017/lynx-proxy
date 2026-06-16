use std::collections::{HashMap, HashSet};
use std::path::Path;
use std::sync::Arc;

use anyhow::{Result, anyhow};

use super::backup::backup_rules_snapshot;
use super::types::{
    ApplyReport, ConfigRule, LynxProjectConfig, PullReport, PushReport, default_rules_export_schema_url,
};
use crate::dao::projects_dao::ProjectsDao;
use crate::dao::request_processing_dao::{RequestProcessingDao, RuleValidator};
use crate::storage::{DataStore, read_json, write_json_atomic};

async fn load_or_create_config(path: &Path, project: &str) -> Result<(LynxProjectConfig, bool)> {
    if let Some(mut config) = read_json::<LynxProjectConfig>(path).await? {
        config.project = project.to_string();
        return Ok((config, false));
    }
    Ok((LynxProjectConfig::new_empty(project), true))
}

async fn load_config(path: &Path) -> Result<LynxProjectConfig> {
    read_json(path)
        .await?
        .ok_or_else(|| anyhow!("config file not found: {}", path.display()))
}

pub async fn resolve_project_id(store: Arc<DataStore>, project: Option<String>) -> Result<String> {
    match project {
        Some(id) => Ok(id),
        None => ProjectsDao::new(store).active_project_id().await,
    }
}

pub async fn push_rules(
    config_path: &Path,
    store: Arc<DataStore>,
    project: Option<String>,
) -> Result<PushReport> {
    let project_id = resolve_project_id(store.clone(), project).await?;
    let (mut config, created_config) = load_or_create_config(config_path, &project_id).await?;
    let dao = RequestProcessingDao::new(store);
    let runtime_rules = dao.list_rules_by_project(&project_id).await?;

    let mut merged: HashMap<i32, ConfigRule> = config
        .rules
        .iter()
        .cloned()
        .map(|rule| (rule.id, rule))
        .collect();

    for rule in &runtime_rules {
        let Some(id) = rule.id else {
            continue;
        };
        merged.insert(id, ConfigRule::from(rule));
    }

    let mut rules: Vec<ConfigRule> = merged.into_values().collect();
    rules.sort_by_key(|rule| rule.id);
    config.rules = rules;
    config.project = project_id.clone();
    config.schema_url = Some(default_rules_export_schema_url());

    write_json_atomic(config_path, &config).await?;

    Ok(PushReport {
        config_path: config_path.to_path_buf(),
        config_id: config.config_id.clone(),
        project: project_id,
        rules_written: config.rules.len(),
        created_config,
    })
}

pub async fn pull_rules(
    config_path: &Path,
    store: Arc<DataStore>,
    project: Option<String>,
) -> Result<PullReport> {
    let project_id = resolve_project_id(store.clone(), project).await?;
    let (config, created_config) = load_or_create_config(config_path, &project_id).await?;
    if created_config {
        write_json_atomic(config_path, &config).await?;
    }

    for rule in &config.rules {
        RuleValidator::validate_rule(&rule.to_request_rule(&config.project))
            .map_err(|e| anyhow!(e.to_string()))?;
    }

    let dao = RequestProcessingDao::new(store.clone());
    let backup_path = backup_rules_snapshot(&store, &config.config_id).await?;

    let existing_ids: HashSet<i32> = dao
        .list_rules()
        .await?
        .into_iter()
        .filter_map(|rule| rule.id)
        .collect();

    let mut created = 0usize;
    let mut updated = 0usize;

    for config_rule in &config.rules {
        let request_rule = config_rule.to_request_rule(&config.project);
        if existing_ids.contains(&config_rule.id) {
            dao.update_rule(request_rule).await?;
            updated += 1;
        } else {
            dao.create_rule_with_id(config_rule.id, request_rule).await?;
            created += 1;
        }
    }

    Ok(PullReport {
        created,
        updated,
        backup_path: Some(backup_path),
        created_config,
    })
}

pub async fn apply_config(config_path: &Path, store: Arc<DataStore>) -> Result<ApplyReport> {
    let config = load_config(config_path).await?;
    let dao = RequestProcessingDao::new(store);

    let config_enabled: HashMap<i32, bool> = config
        .rules
        .iter()
        .map(|rule| (rule.id, rule.enabled))
        .collect();
    let config_ids: HashSet<i32> = config_enabled.keys().copied().collect();

    let proxy_rules = dao.list_rules_by_project(&config.project).await?;
    let proxy_ids: HashSet<i32> = proxy_rules.iter().filter_map(|rule| rule.id).collect();

    let mut report = ApplyReport::default();

    for mut rule in proxy_rules {
        let rule_id = rule.id.ok_or_else(|| anyhow!("rule missing id"))?;

        match config_enabled.get(&rule_id) {
            Some(&enabled) => {
                if rule.enabled == enabled {
                    continue;
                }
                rule.enabled = enabled;
                dao.update_rule(rule).await?;
                if enabled {
                    report.enabled += 1;
                } else {
                    report.disabled_from_config += 1;
                }
            }
            None if rule.enabled => {
                rule.enabled = false;
                dao.update_rule(rule).await?;
                report.disabled_not_in_config += 1;
            }
            None => {}
        }
    }

    report.skipped_only_in_config = config_ids.difference(&proxy_ids).count();

    Ok(report)
}

pub async fn read_project_config(path: &Path) -> Result<LynxProjectConfig> {
    load_config(path).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dao::request_processing_dao::{CaptureRule, HandlerRule, RequestRule};
    use tempfile::tempdir;

    fn sample_config_rule(id: i32, name: &str, enabled: bool, match_expr: &str) -> ConfigRule {
        ConfigRule {
            id,
            name: name.to_string(),
            description: None,
            enabled,
            priority: 50,
            capture: CaptureRule {
                id: None,
                match_expr: match_expr.to_string(),
            },
            handlers: vec![HandlerRule::block_handler(Some(404), None)],
        }
    }

    #[tokio::test]
    async fn push_creates_config_in_project_dir() -> Result<()> {
        let project = tempdir()?;
        let data = tempdir()?;
        let config_path = project.path().join("lynx.json");
        let store = DataStore::new(data.path()).await?;

        let report = push_rules(&config_path, store, Some("default".to_string())).await?;
        assert!(report.created_config);
        assert_eq!(report.rules_written, 0);
        assert!(config_path.exists());

        let config = read_project_config(&config_path).await?;
        assert_eq!(config.project, "default");
        assert!(!config.config_id.is_empty());
        Ok(())
    }

    #[tokio::test]
    async fn push_pull_roundtrip_preserves_id() -> Result<()> {
        let project = tempdir()?;
        let data = tempdir()?;
        let config_path = project.path().join("lynx.json");
        let store = DataStore::new(data.path()).await?;
        let dao = RequestProcessingDao::new(store.clone());

        let mut rule = RequestRule::default();
        rule.name = "roundtrip".to_string();
        rule.capture.match_expr = "example.com".to_string();
        rule.handlers = vec![HandlerRule::block_handler(Some(404), None)];
        rule.enabled = true;
        let rule_id = dao.create_rule(rule).await?;

        push_rules(&config_path, store.clone(), Some("default".to_string())).await?;

        let mut config = read_project_config(&config_path).await?;
        config.rules[0].name = "updated".to_string();
        write_json_atomic(&config_path, &config).await?;

        let pull_report = pull_rules(&config_path, store.clone(), Some("default".to_string())).await?;
        assert_eq!(pull_report.created, 0);
        assert_eq!(pull_report.updated, 1);

        let stored = dao.get_rule(rule_id).await?.unwrap();
        assert_eq!(stored.id, Some(rule_id));
        assert_eq!(stored.name, "updated");
        Ok(())
    }

    #[tokio::test]
    async fn pull_creates_config_when_missing() -> Result<()> {
        let project = tempdir()?;
        let data = tempdir()?;
        let config_path = project.path().join(".lynx.json");
        let store = DataStore::new(data.path()).await?;

        let report = pull_rules(&config_path, store, Some("default".to_string())).await?;
        assert!(report.created_config);
        assert!(config_path.exists());
        assert_eq!(report.created, 0);
        assert_eq!(report.updated, 0);

        let config = read_project_config(&config_path).await?;
        assert_eq!(config.project, "default");
        assert!(config.rules.is_empty());
        Ok(())
    }

    #[tokio::test]
    async fn pull_creates_backup() -> Result<()> {
        let project = tempdir()?;
        let data = tempdir()?;
        let config_path = project.path().join("lynx.json");
        let store = DataStore::new(data.path()).await?;

        push_rules(&config_path, store.clone(), Some("default".to_string())).await?;
        let report = pull_rules(&config_path, store.clone(), Some("default".to_string())).await?;
        assert!(report.backup_path.is_some());
        assert!(report.backup_path.as_ref().unwrap().exists());
        Ok(())
    }

    #[tokio::test]
    async fn apply_only_toggles_enabled_within_project() -> Result<()> {
        let project = tempdir()?;
        let data = tempdir()?;
        let config_path = project.path().join("lynx.json");
        let store = DataStore::new(data.path()).await?;
        let dao = RequestProcessingDao::new(store.clone());

        let mut in_config = RequestRule::default();
        in_config.name = "in-config".to_string();
        in_config.project = "default".to_string();
        in_config.capture.match_expr = "a.example.com".to_string();
        in_config.priority = 50;
        in_config.handlers = vec![HandlerRule::block_handler(Some(404), None)];
        in_config.enabled = true;
        let in_config_id = dao.create_rule(in_config).await?;

        let mut orphan = RequestRule::default();
        orphan.name = "orphan".to_string();
        orphan.project = "default".to_string();
        orphan.capture.match_expr = "b.example.com".to_string();
        orphan.priority = 50;
        orphan.handlers = vec![HandlerRule::block_handler(Some(404), None)];
        orphan.enabled = true;
        dao.create_rule(orphan).await?;

        let mut other_project = RequestRule::default();
        other_project.name = "other-project".to_string();
        other_project.project = "other".to_string();
        other_project.capture.match_expr = "c.example.com".to_string();
        other_project.priority = 50;
        other_project.handlers = vec![HandlerRule::block_handler(Some(404), None)];
        other_project.enabled = true;
        dao.create_rule(other_project).await?;

        let config = LynxProjectConfig {
            schema_url: None,
            config_id: "test-config".to_string(),
            project: "default".to_string(),
            rules: vec![
                sample_config_rule(in_config_id, "in-config", false, "a.example.com"),
                sample_config_rule(99, "new-only", true, "c.example.com"),
            ],
        };
        write_json_atomic(&config_path, &config).await?;

        let report = apply_config(&config_path, store.clone()).await?;
        assert_eq!(report.disabled_from_config, 1);
        assert_eq!(report.disabled_not_in_config, 1);
        assert_eq!(report.skipped_only_in_config, 1);

        let rules = dao.list_rules().await?;
        let by_name: HashMap<_, _> = rules.iter().map(|r| (r.name.as_str(), r.enabled)).collect();
        assert_eq!(by_name.get("in-config"), Some(&false));
        assert_eq!(by_name.get("orphan"), Some(&false));
        assert_eq!(by_name.get("other-project"), Some(&true));
        Ok(())
    }

    #[tokio::test]
    async fn pull_does_not_delete_unmentioned_rules() -> Result<()> {
        let project = tempdir()?;
        let data = tempdir()?;
        let config_path = project.path().join("lynx.json");
        let store = DataStore::new(data.path()).await?;
        let dao = RequestProcessingDao::new(store.clone());

        let mut keep = RequestRule::default();
        keep.name = "keep-me".to_string();
        keep.capture.match_expr = "keep.example.com".to_string();
        dao.create_rule(keep).await?;

        let config = LynxProjectConfig {
            schema_url: None,
            config_id: "test".to_string(),
            project: "default".to_string(),
            rules: vec![sample_config_rule(99, "new", true, "new.example.com")],
        };
        write_json_atomic(&config_path, &config).await?;

        pull_rules(&config_path, store.clone(), Some("default".to_string())).await?;
        let rules = dao.list_rules().await?;
        assert_eq!(rules.len(), 2);
        assert!(rules.iter().any(|r| r.name == "keep-me"));
        assert!(rules.iter().any(|r| r.name == "new"));
        Ok(())
    }
}
