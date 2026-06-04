use std::path::Path;

use anyhow::Result;
use tokio::fs;

/// Allocate the next numeric id by scanning `{id}.json` files in a directory.
pub async fn next_id_in_dir(dir: &Path) -> Result<i32> {
    if !dir.exists() {
        fs::create_dir_all(dir).await?;
    }
    let mut max_id = 0i32;
    let mut entries = fs::read_dir(dir).await?;
    while let Some(entry) = entries.next_entry().await? {
        let file_name = entry.file_name();
        let name = file_name.to_string_lossy();
        if let Some(stem) = name.strip_suffix(".json") {
            if let Ok(id) = stem.parse::<i32>() {
                max_id = max_id.max(id);
            }
        }
    }
    Ok(max_id + 1)
}
