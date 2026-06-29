mod id;
mod json_file;

use std::path::{Path, PathBuf};
use std::sync::Arc;

use anyhow::{Result, anyhow};
use tokio::fs;
use tokio::sync::RwLock;

use crate::dao::capture_rules_dao::CaptureRules;
use crate::dao::client_proxy_dao::ClientProxyConfig;
use crate::dao::net_request_dao::CaptureSwitch;
use crate::dao::request_processing_dao::matcher::{CompiledRule, RuleMatcher};
use crate::dao::request_processing_dao::types::RequestRule;
use crate::dao::traffic_filter_history_dao::TrafficFilterHistory;
use crate::dao::{general_setting_dao::GeneralSetting, https_capture_dao::CaptureFilter};

pub use json_file::{read_json, read_json_or_default, write_json_atomic};

#[derive(Clone)]
pub struct RulesCacheEntry {
    pub rules: Vec<RequestRule>,
    pub compiled: Vec<CompiledRule>,
}

#[derive(Clone, PartialEq, Eq)]
struct RulesDirFingerprint {
    file_count: usize,
    max_mtime: std::time::SystemTime,
}

#[derive(Clone)]
struct RulesCacheState {
    entry: RulesCacheEntry,
    fingerprint: RulesDirFingerprint,
}

pub struct DataStore {
    root: PathBuf,
    rules_cache: RwLock<Option<RulesCacheState>>,
}

impl DataStore {
    pub async fn new(root: impl AsRef<Path>) -> Result<Arc<Self>> {
        let root = root.as_ref().to_path_buf();
        let store = Arc::new(Self {
            root: root.clone(),
            rules_cache: RwLock::new(None),
        });
        store.ensure_layout().await?;
        Ok(store)
    }

    pub fn root(&self) -> &Path {
        &self.root
    }

    pub fn settings_dir(&self) -> PathBuf {
        self.root.join("settings")
    }

    pub fn rules_dir(&self) -> PathBuf {
        self.root.join("rules")
    }

    pub fn api_studio_dir(&self) -> PathBuf {
        self.root.join("api_studio")
    }

    pub fn api_studio_drafts_dir(&self) -> PathBuf {
        self.api_studio_dir().join("drafts")
    }

    pub fn api_studio_history_dir(&self) -> PathBuf {
        self.api_studio_dir().join("history")
    }

    pub fn api_studio_collection_path(&self) -> PathBuf {
        self.api_studio_dir().join("collection.json")
    }

    pub fn api_studio_draft_path(&self, id: &str) -> PathBuf {
        self.api_studio_drafts_dir().join(format!("{id}.json"))
    }

    pub fn api_studio_history_path(&self, id: &str) -> PathBuf {
        self.api_studio_history_dir().join(format!("{id}.json"))
    }

    pub fn setting_path(&self, name: &str) -> PathBuf {
        self.settings_dir().join(format!("{name}.json"))
    }

    pub fn rule_path(&self, id: i32) -> PathBuf {
        self.rules_dir().join(format!("{id}.json"))
    }

    pub fn templates_path(&self) -> PathBuf {
        self.rules_dir().join("templates.json")
    }

    pub async fn invalidate_rules_cache(&self) {
        let mut cache = self.rules_cache.write().await;
        *cache = None;
    }

    async fn rules_dir_fingerprint(&self) -> Result<RulesDirFingerprint> {
        use std::time::UNIX_EPOCH;

        let mut file_count = 0usize;
        let mut max_mtime = UNIX_EPOCH;
        let mut entries = fs::read_dir(self.rules_dir()).await?;
        while let Some(entry) = entries.next_entry().await? {
            let name = entry.file_name().to_string_lossy().into_owned();
            if !name.ends_with(".json") || name == "templates.json" {
                continue;
            }
            file_count += 1;
            let meta = entry.metadata().await?;
            if let Ok(mtime) = meta.modified() {
                max_mtime = max_mtime.max(mtime);
            }
        }
        Ok(RulesDirFingerprint {
            file_count,
            max_mtime,
        })
    }

    async fn is_rules_cache_stale(&self, fingerprint: &RulesDirFingerprint) -> Result<bool> {
        Ok(self.rules_dir_fingerprint().await? != *fingerprint)
    }

    pub async fn get_rules_cache(&self) -> Result<Vec<RequestRule>> {
        Ok(self.get_rules_cache_entry().await?.rules)
    }

    pub async fn get_rules_cache_entry(&self) -> Result<RulesCacheEntry> {
        if let Some(state) = self.rules_cache.read().await.clone()
            && !self.is_rules_cache_stale(&state.fingerprint).await?
        {
            return Ok(state.entry);
        }

        let fingerprint = self.rules_dir_fingerprint().await?;
        let entry = self.load_rules_cache_entry().await?;
        let mut cache = self.rules_cache.write().await;
        *cache = Some(RulesCacheState {
            entry: entry.clone(),
            fingerprint,
        });
        Ok(entry)
    }

    async fn load_all_rules(&self) -> Result<Vec<RequestRule>> {
        let mut rules = Vec::new();
        let dir = self.rules_dir();
        let mut entries = fs::read_dir(&dir).await?;
        while let Some(entry) = entries.next_entry().await? {
            let path = entry.path();
            let file_name = entry.file_name();
            let name = file_name.to_string_lossy();
            if !name.ends_with(".json") || name == "templates.json" {
                continue;
            }
            let rule = read_json::<RequestRule>(&path).await.map_err(|error| {
                anyhow!(
                    "Failed to load rule file {}: {error}. If you upgraded to matchExpr, please clear the rules directory and recreate rules.",
                    path.display()
                )
            })?;
            if let Some(rule) = rule {
                rules.push(rule);
            }
        }
        rules.sort_by(|a, b| {
            b.priority
                .cmp(&a.priority)
                .then_with(|| a.id.unwrap_or(0).cmp(&b.id.unwrap_or(0)))
        });
        Ok(rules)
    }

    async fn load_rules_cache_entry(&self) -> Result<RulesCacheEntry> {
        let rules = self.load_all_rules().await?;
        let compiled = RuleMatcher::compile_rules(&rules).map_err(|error| {
            anyhow!(
                "Failed to load rules: {error}. If you upgraded to matchExpr, please clear the rules directory and recreate rules."
            )
        })?;
        Ok(RulesCacheEntry { rules, compiled })
    }

    pub async fn next_rule_id(&self) -> Result<i32> {
        id::next_id_in_dir(&self.rules_dir()).await
    }

    async fn ensure_layout(&self) -> Result<()> {
        fs::create_dir_all(self.settings_dir()).await?;
        fs::create_dir_all(self.rules_dir()).await?;
        fs::create_dir_all(self.api_studio_drafts_dir()).await?;
        fs::create_dir_all(self.api_studio_history_dir()).await?;

        self.ensure_setting_defaults().await?;
        self.ensure_collection_default().await?;
        Ok(())
    }

    async fn ensure_setting_defaults(&self) -> Result<()> {
        let defaults: [(&str, serde_json::Value); 6] = [
            (
                "capture_switch",
                serde_json::to_value(CaptureSwitch::default())?,
            ),
            (
                "https_capture",
                serde_json::to_value(CaptureFilter::default())?,
            ),
            ("general", serde_json::to_value(GeneralSetting::default())?),
            (
                "client_proxy",
                serde_json::to_value(ClientProxyConfig::default())?,
            ),
            (
                "capture_rules",
                serde_json::to_value(CaptureRules::default())?,
            ),
            (
                "traffic_filter_history",
                serde_json::to_value(TrafficFilterHistory::default())?,
            ),
        ];

        for (name, value) in defaults {
            let path = self.setting_path(name);
            if !path.exists() {
                write_json_atomic(&path, &value).await?;
            }
        }
        Ok(())
    }

    async fn ensure_collection_default(&self) -> Result<()> {
        let path = self.api_studio_collection_path();
        if !path.exists() {
            use crate::dao::api_studio::CollectionFile;
            write_json_atomic(&path, &CollectionFile::default()).await?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dao::request_processing_dao::RequestRule;
    use tempfile::tempdir;

    #[tokio::test]
    async fn reloads_rules_cache_when_rule_files_change_externally() -> Result<()> {
        let dir = tempdir()?;
        let store = DataStore::new(dir.path()).await?;

        let rule_path = store.rule_path(1);
        let rule = RequestRule {
            id: Some(1),
            project: "default".to_string(),
            name: "v1".to_string(),
            description: None,
            enabled: true,
            priority: 10,
            capture: crate::dao::request_processing_dao::CaptureRule {
                id: Some(1),
                match_expr: "/".to_string(),
            },
            handlers: vec![],
        };
        write_json_atomic(&rule_path, &rule).await?;

        let first = store.get_rules_cache_entry().await?;
        assert_eq!(first.rules[0].name, "v1");

        let mut updated = rule.clone();
        updated.name = "v2".to_string();
        write_json_atomic(&rule_path, &updated).await?;

        let second = store.get_rules_cache_entry().await?;
        assert_eq!(second.rules[0].name, "v2");
        Ok(())
    }
}
