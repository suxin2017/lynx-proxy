use std::path::PathBuf;

use anyhow::Result;
use lynx_storage::DataStore;
use lynx_storage::project_config::{apply_config, pull_rules, push_rules};
use serde_json::json;

use crate::resolve_data_dir;

pub struct RulesOptions {
    pub file: Option<PathBuf>,
    pub data_dir: Option<String>,
    pub project: Option<String>,
}

pub fn resolve_config_path(file: Option<PathBuf>) -> Result<PathBuf> {
    match file {
        Some(path) => Ok(path),
        None => Ok(std::env::current_dir()?.join(".lynx.json")),
    }
}

pub async fn run_push(options: RulesOptions) -> Result<()> {
    let config_path = resolve_config_path(options.file)?;
    let data_dir = resolve_data_dir(options.data_dir)?;
    let store = DataStore::new(&data_dir).await?;

    // Git-like semantics (breaking change):
    // - `rules push`: local (data-dir) -> external (.lynx.json)
    // Storage layer already implements this as `push_rules`.
    let report = push_rules(&config_path, store, options.project).await?;
    if report.created_config {
        println!("Created {}", config_path.display());
    }
    println!(
        "Pushed {} rule(s) for project '{}' to {} (configId: {})",
        report.rules_written,
        report.project,
        config_path.display(),
        report.config_id
    );
    Ok(())
}

pub async fn run_pull(options: RulesOptions) -> Result<()> {
    let config_path = resolve_config_path(options.file)?;
    let data_dir = resolve_data_dir(options.data_dir)?;
    let store = DataStore::new(&data_dir).await?;

    // Git-like semantics (breaking change):
    // - `rules pull`: external (.lynx.json) -> local (data-dir)
    // Storage layer implements this as `pull_rules`.
    let report = pull_rules(&config_path, store, options.project).await?;
    if report.created_config {
        println!("Created {}", config_path.display());
    }
    println!(
        "Pulled from {}: {} created, {} updated",
        config_path.display(),
        report.created,
        report.updated
    );
    if let Some(path) = &report.backup_path {
        println!("Backup saved to {}", path.display());
    }
    Ok(())
}

pub async fn run_apply(options: RulesOptions) -> Result<()> {
    let config_path = resolve_config_path(options.file)?;
    let data_dir = resolve_data_dir(options.data_dir)?;
    let store = DataStore::new(&data_dir).await?;

    let report = apply_config(&config_path, store).await?;
    if report.enabled > 0 {
        println!("Enabled:  {} rule(s)", report.enabled);
    }
    if report.disabled_from_config > 0 {
        println!(
            "Disabled: {} rule(s) (matched config, enabled: false)",
            report.disabled_from_config
        );
    }
    if report.disabled_not_in_config > 0 {
        println!(
            "Disabled: {} rule(s) (not in config, were enabled)",
            report.disabled_not_in_config
        );
    }
    if report.skipped_only_in_config > 0 {
        println!(
            "Skipped:  {} rule(s) only in config (run `lynx rules pull`)",
            report.skipped_only_in_config
        );
    }
    if report.enabled == 0
        && report.disabled_from_config == 0
        && report.disabled_not_in_config == 0
        && report.skipped_only_in_config == 0
    {
        println!("No rule switches changed.");
    }
    Ok(())
}

pub async fn run_schema_export(out: Option<PathBuf>) -> Result<()> {
    use schemars::schema_for;

    let out_path = match out {
        Some(path) => path,
        None => std::env::current_dir()?
            .join("schemas")
            .join("rules-export.schema.json"),
    };
    if let Some(parent) = out_path.parent() {
        tokio::fs::create_dir_all(parent).await?;
    }

    let schema = schema_for!(lynx_storage::project_config::LynxProjectConfig);
    let mut value = serde_json::to_value(&schema)?;
    if let Some(obj) = value.as_object_mut() {
        obj.insert(
            "$id".to_string(),
            json!(lynx_storage::project_config::default_rules_export_schema_url()),
        );
    }

    let content = serde_json::to_string_pretty(&value)?;
    tokio::fs::write(&out_path, content).await?;
    println!("Wrote schema to {}", out_path.display());
    Ok(())
}
