use std::path::Path;

use anyhow::{Context, Result};
use serde::Serialize;
use serde::de::DeserializeOwned;
use tokio::fs;

pub async fn read_json<T: DeserializeOwned>(path: &Path) -> Result<Option<T>> {
    if !path.exists() {
        return Ok(None);
    }
    let content = fs::read_to_string(path)
        .await
        .with_context(|| format!("read {}", path.display()))?;
    let value =
        serde_json::from_str(&content).with_context(|| format!("parse json {}", path.display()))?;
    Ok(Some(value))
}

pub async fn read_json_or_default<T: DeserializeOwned + Default>(path: &Path) -> Result<T> {
    Ok(read_json(path).await?.unwrap_or_default())
}

pub async fn write_json_atomic<T: Serialize>(path: &Path, value: &T) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .await
            .with_context(|| format!("create dir {}", parent.display()))?;
    }

    let content = serde_json::to_string_pretty(value)?;
    let tmp_path = path.with_extension("json.tmp");
    fs::write(&tmp_path, &content)
        .await
        .with_context(|| format!("write {}", tmp_path.display()))?;
    fs::rename(&tmp_path, path)
        .await
        .with_context(|| format!("rename {} -> {}", tmp_path.display(), path.display()))?;
    Ok(())
}
