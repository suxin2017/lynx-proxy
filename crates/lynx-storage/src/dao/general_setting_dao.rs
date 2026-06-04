use crate::storage::{DataStore, read_json_or_default, write_json_atomic};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub enum ConnectType {
    #[serde(rename = "0")]
    ShortPoll = 0,
    #[serde(rename = "1")]
    SSE = 1,
}

impl Default for ConnectType {
    fn default() -> Self {
        ConnectType::SSE
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GeneralSetting {
    pub max_log_size: i32,
    pub connect_type: ConnectType,
    pub language: String,
}

impl Default for GeneralSetting {
    fn default() -> Self {
        Self {
            max_log_size: 1000,
            connect_type: ConnectType::default(),
            language: "zh-CN".to_string(),
        }
    }
}

pub struct GeneralSettingDao {
    store: Arc<DataStore>,
}

impl GeneralSettingDao {
    pub fn new(store: Arc<DataStore>) -> Self {
        Self { store }
    }

    fn path(&self) -> std::path::PathBuf {
        self.store.setting_path("general")
    }

    pub async fn get_general_setting(&self) -> Result<GeneralSetting> {
        read_json_or_default(&self.path()).await
    }

    pub async fn update_general_setting(&self, setting: GeneralSetting) -> Result<()> {
        write_json_atomic(&self.path(), &setting).await
    }

    pub async fn update_connect_type(&self, connect_type: ConnectType) -> Result<()> {
        let mut setting = self.get_general_setting().await?;
        setting.connect_type = connect_type;
        self.update_general_setting(setting).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::DataStore;

    async fn setup_store() -> (Arc<DataStore>, tempfile::TempDir) {
        let dir = tempfile::tempdir().unwrap();
        let store = DataStore::new(dir.path()).await.unwrap();
        (store, dir)
    }

    #[tokio::test]
    async fn test_get_default_general_setting() {
        let (store, _dir) = setup_store().await;
        let dao = GeneralSettingDao::new(store);

        let setting = dao.get_general_setting().await.unwrap();
        assert_eq!(setting.max_log_size, 1000);
        assert!(matches!(setting.connect_type, ConnectType::SSE));
    }

    #[tokio::test]
    async fn test_update_and_get_general_setting() {
        let (store, _dir) = setup_store().await;
        let dao = GeneralSettingDao::new(store);

        let new_setting = GeneralSetting {
            max_log_size: 2000,
            connect_type: ConnectType::SSE,
            language: "zh-CN".to_string(),
        };

        dao.update_general_setting(new_setting.clone()).await.unwrap();
        let retrieved_setting = dao.get_general_setting().await.unwrap();

        assert_eq!(retrieved_setting.max_log_size, 2000);
        assert!(matches!(retrieved_setting.connect_type, ConnectType::SSE));
    }
}
