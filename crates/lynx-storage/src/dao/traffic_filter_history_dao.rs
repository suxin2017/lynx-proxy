use crate::storage::{DataStore, read_json_or_default, write_json_atomic};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

pub const DEFAULT_TRAFFIC_FILTER_HISTORY_LIMIT: usize = 20;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TrafficFilterHistory {
    #[serde(default)]
    pub entries: Vec<String>,
}

pub struct TrafficFilterHistoryDao {
    store: Arc<DataStore>,
}

impl TrafficFilterHistoryDao {
    pub fn new(store: Arc<DataStore>) -> Self {
        Self { store }
    }

    fn path(&self) -> std::path::PathBuf {
        self.store.setting_path("traffic_filter_history")
    }

    pub async fn get(&self) -> Result<TrafficFilterHistory> {
        read_json_or_default(&self.path()).await
    }

    pub async fn replace(&self, entries: Vec<String>) -> Result<TrafficFilterHistory> {
        let sanitized = sanitize_entries(entries);
        let history = TrafficFilterHistory {
            entries: sanitized,
        };
        write_json_atomic(&self.path(), &history).await?;
        Ok(history)
    }

    pub async fn append(&self, expr: &str) -> Result<TrafficFilterHistory> {
        let trimmed = expr.trim();
        if trimmed.is_empty() {
            return self.get().await;
        }

        let mut history = self.get().await?;
        history.entries.retain(|entry| entry != trimmed);
        history.entries.insert(0, trimmed.to_string());
        history.entries.truncate(DEFAULT_TRAFFIC_FILTER_HISTORY_LIMIT);
        write_json_atomic(&self.path(), &history).await?;
        Ok(history)
    }

    pub async fn clear(&self) -> Result<TrafficFilterHistory> {
        self.replace(Vec::new()).await
    }
}

fn sanitize_entries(entries: Vec<String>) -> Vec<String> {
    let mut seen = std::collections::HashSet::new();
    let mut sanitized = Vec::new();

    for entry in entries {
        let trimmed = entry.trim().to_string();
        if trimmed.is_empty() || !seen.insert(trimmed.clone()) {
            continue;
        }
        sanitized.push(trimmed);
        if sanitized.len() >= DEFAULT_TRAFFIC_FILTER_HISTORY_LIMIT {
            break;
        }
    }

    sanitized
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::DataStore;

    #[tokio::test]
    async fn append_dedupes_and_prepends() {
        let dir = tempfile::tempdir().unwrap();
        let store = DataStore::new(dir.path()).await.unwrap();
        let dao = TrafficFilterHistoryDao::new(store);

        dao.append("example.com").await.unwrap();
        dao.append("other.com").await.unwrap();
        let history = dao.append("example.com").await.unwrap();

        assert_eq!(
            history.entries,
            vec!["example.com".to_string(), "other.com".to_string()]
        );
    }

    #[tokio::test]
    async fn append_enforces_limit() {
        let dir = tempfile::tempdir().unwrap();
        let store = DataStore::new(dir.path()).await.unwrap();
        let dao = TrafficFilterHistoryDao::new(store);

        for i in 0..DEFAULT_TRAFFIC_FILTER_HISTORY_LIMIT + 5 {
            dao.append(&format!("v{i}")).await.unwrap();
        }

        let history = dao.get().await.unwrap();
        assert_eq!(history.entries.len(), DEFAULT_TRAFFIC_FILTER_HISTORY_LIMIT);
        assert_eq!(history.entries[0], format!("v{}", DEFAULT_TRAFFIC_FILTER_HISTORY_LIMIT + 4));
    }

    #[tokio::test]
    async fn clear_removes_all_entries() {
        let dir = tempfile::tempdir().unwrap();
        let store = DataStore::new(dir.path()).await.unwrap();
        let dao = TrafficFilterHistoryDao::new(store);

        dao.append("example.com").await.unwrap();
        let history = dao.clear().await.unwrap();

        assert!(history.entries.is_empty());
    }
}
