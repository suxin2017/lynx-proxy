mod id;
mod json_file;

use std::path::{Path, PathBuf};
use std::sync::Arc;

use anyhow::Result;
use tokio::fs;
use tokio::sync::RwLock;

use crate::dao::net_request_dao::CaptureSwitch;
use crate::dao::request_processing_dao::types::RequestRule;
use crate::dao::{https_capture_dao::CaptureFilter, general_setting_dao::GeneralSetting};
use crate::dao::client_proxy_dao::ClientProxyConfig;

pub use json_file::{read_json, read_json_or_default, write_json_atomic};

pub struct DataStore {
    root: PathBuf,
    rules_cache: RwLock<Option<Vec<RequestRule>>>,
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

    pub fn api_debug_dir(&self) -> PathBuf {
        self.root.join("api_debug")
    }

    pub fn api_debug_requests_dir(&self) -> PathBuf {
        self.api_debug_dir().join("requests")
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

    pub fn tree_path(&self) -> PathBuf {
        self.api_debug_dir().join("tree.json")
    }

    pub fn api_debug_request_path(&self, id: i32) -> PathBuf {
        self.api_debug_requests_dir().join(format!("{id}.json"))
    }

    pub async fn invalidate_rules_cache(&self) {
        let mut cache = self.rules_cache.write().await;
        *cache = None;
    }

    pub async fn get_rules_cache(&self) -> Result<Vec<RequestRule>> {
        {
            let cache = self.rules_cache.read().await;
            if let Some(rules) = cache.as_ref() {
                return Ok(rules.clone());
            }
        }

        let rules = self.load_all_rules().await?;
        let mut cache = self.rules_cache.write().await;
        *cache = Some(rules.clone());
        Ok(rules)
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
            if let Some(rule) = read_json::<RequestRule>(&path).await? {
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

    pub async fn next_rule_id(&self) -> Result<i32> {
        id::next_id_in_dir(&self.rules_dir()).await
    }

    pub async fn next_api_debug_id(&self) -> Result<i32> {
        id::next_id_in_dir(&self.api_debug_requests_dir()).await
    }

    pub async fn next_tree_node_id(&self) -> Result<i32> {
        let tree = read_json_or_default::<TreeFile>(&self.tree_path()).await?;
        Ok(tree
            .nodes
            .iter()
            .map(|n| n.id)
            .max()
            .unwrap_or(0)
            + 1)
    }

    async fn ensure_layout(&self) -> Result<()> {
        fs::create_dir_all(self.settings_dir()).await?;
        fs::create_dir_all(self.rules_dir()).await?;
        fs::create_dir_all(self.api_debug_requests_dir()).await?;

        self.ensure_setting_defaults().await?;
        self.ensure_tree_default().await?;
        Ok(())
    }

    async fn ensure_setting_defaults(&self) -> Result<()> {
        let defaults: [(&str, serde_json::Value); 4] = [
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
        ];

        for (name, value) in defaults {
            let path = self.setting_path(name);
            if !path.exists() {
                write_json_atomic(&path, &value).await?;
            }
        }
        Ok(())
    }

    async fn ensure_tree_default(&self) -> Result<()> {
        let path = self.tree_path();
        if !path.exists() {
            write_json_atomic(&path, &TreeFile::default()).await?;
        }
        Ok(())
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct TreeFile {
    pub nodes: Vec<TreeNodeRecord>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TreeNodeRecord {
    pub id: i32,
    pub name: String,
    pub node_type: crate::models::api_debug_tree::NodeType,
    pub parent_id: Option<i32>,
    pub api_debug_id: Option<i32>,
    pub sort_order: i32,
    pub created_at: i64,
    pub updated_at: i64,
}
