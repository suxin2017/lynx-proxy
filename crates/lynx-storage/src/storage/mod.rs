mod id;
mod json_file;

use std::path::{Path, PathBuf};
use std::sync::Arc;

use anyhow::{Result, anyhow};
use tokio::fs;
use tokio::sync::RwLock;

use crate::dao::net_request_dao::CaptureSwitch;
use crate::dao::request_processing_dao::types::RequestRule;
use crate::dao::{https_capture_dao::CaptureFilter, general_setting_dao::GeneralSetting};
use crate::dao::client_proxy_dao::ClientProxyConfig;
use crate::dao::request_processing_dao::matcher::{CompiledRule, RuleMatcher};
use crate::dao::capture_rules_dao::CaptureRules;

pub use json_file::{read_json, read_json_or_default, write_json_atomic};

#[derive(Clone)]
pub struct RulesCacheEntry {
    pub rules: Vec<RequestRule>,
    pub compiled: Vec<CompiledRule>,
}

pub struct DataStore {
    root: PathBuf,
    rules_cache: RwLock<Option<RulesCacheEntry>>,
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

    pub async fn get_rules_cache(&self) -> Result<Vec<RequestRule>> {
        {
            let cache = self.rules_cache.read().await;
            if let Some(entry) = cache.as_ref() {
                return Ok(entry.rules.clone());
            }
        }

        let entry = self.load_rules_cache_entry().await?;
        let rules = entry.rules.clone();
        let mut cache = self.rules_cache.write().await;
        *cache = Some(entry);
        Ok(rules)
    }

    pub async fn get_rules_cache_entry(&self) -> Result<RulesCacheEntry> {
        {
            let cache = self.rules_cache.read().await;
            if let Some(entry) = cache.as_ref() {
                return Ok(entry.clone());
            }
        }
        let entry = self.load_rules_cache_entry().await?;
        let mut cache = self.rules_cache.write().await;
        *cache = Some(entry.clone());
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
        let defaults: [(&str, serde_json::Value); 5] = [
            (
                "capture_switch",
                serde_json::to_value(CaptureSwitch::default())?,
            ),
            (
                "https_capture",
                serde_json::to_value(CaptureFilter::default())?,
            ),
            (
                "general",
                serde_json::to_value(GeneralSetting::default())?,
            ),
            (
                "client_proxy",
                serde_json::to_value(ClientProxyConfig::default())?,
            ),
            (
                "capture_rules",
                serde_json::to_value(CaptureRules::default())?,
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
