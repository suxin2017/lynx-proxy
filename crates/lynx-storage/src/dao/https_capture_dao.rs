use crate::storage::{DataStore, read_json_or_default, write_json_atomic};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DomainFilter {
    #[schema(example = "example.com")]
    pub domain: String,
    #[schema(example = true)]
    pub enabled: bool,
    #[schema(minimum = 0, maximum = 65535, example = 443)]
    pub port: u16,
}

#[derive(Debug, Serialize, Deserialize, ToSchema, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct CaptureFilter {
    pub include_domains: Vec<DomainFilter>,
    pub exclude_domains: Vec<DomainFilter>,
    pub enabled: bool,
}

impl Default for DomainFilter {
    fn default() -> Self {
        Self {
            domain: "".to_string(),
            enabled: false,
            port: 8080,
        }
    }
}

pub struct HttpsCaptureDao {
    store: Arc<DataStore>,
}

impl HttpsCaptureDao {
    pub fn new(store: Arc<DataStore>) -> Self {
        Self { store }
    }

    fn path(&self) -> std::path::PathBuf {
        self.store.setting_path("https_capture")
    }

    pub async fn get_capture_filter(&self) -> Result<CaptureFilter> {
        read_json_or_default(&self.path()).await
    }

    pub async fn update_capture_filter(&self, filter: CaptureFilter) -> Result<()> {
        write_json_atomic(&self.path(), &filter).await
    }
}
