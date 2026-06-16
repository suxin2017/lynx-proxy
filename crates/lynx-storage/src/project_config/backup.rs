use std::path::PathBuf;

use anyhow::{Context, Result};
use serde::Serialize;
use tokio::fs;

use crate::dao::request_processing_dao::RequestRule;
use crate::storage::{DataStore, write_json_atomic};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RulesBackup {
    config_id: String,
    backed_up_at: u64,
    rules: Vec<RequestRule>,
}

pub async fn backup_rules_snapshot(
    store: &DataStore,
    config_id: &str,
) -> Result<PathBuf> {
    let rules = store.get_rules_cache().await?;
    let backed_up_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .context("system time before unix epoch")?
        .as_secs();

    let backup_dir = store
        .root()
        .join("backups")
        .join("lynx")
        .join(config_id);
    fs::create_dir_all(&backup_dir)
        .await
        .with_context(|| format!("create backup dir {}", backup_dir.display()))?;

    let backup_path = backup_dir.join(format!("{backed_up_at}.json"));
    let backup = RulesBackup {
        config_id: config_id.to_string(),
        backed_up_at,
        rules,
    };
    write_json_atomic(&backup_path, &backup).await?;
    Ok(backup_path)
}
