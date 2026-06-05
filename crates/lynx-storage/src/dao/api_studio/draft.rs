use std::sync::Arc;

use serde::Deserialize;

use crate::dao::api_studio::error::{ApiStudioError, storage as storage_err};
use crate::dao::api_studio::ids::new_id;
use crate::models::api_studio::{
    ApiStudioDraft, HttpMethod, KeyValueRow, RequestSettings,
};
use crate::storage::{DataStore, read_json, write_json_atomic};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveDraftRequest {
    pub name: String,
    pub method: HttpMethod,
    pub url: String,
    #[serde(default)]
    pub query_params: Vec<KeyValueRow>,
    #[serde(default)]
    pub headers: Vec<KeyValueRow>,
    #[serde(default)]
    pub body: String,
    #[serde(default)]
    pub cookies: Vec<KeyValueRow>,
    #[serde(default)]
    pub settings: RequestSettings,
    #[serde(default)]
    pub timeout: Option<u64>,
}

#[derive(Clone)]
pub struct DraftStore {
    store: Arc<DataStore>,
}

impl DraftStore {
    pub fn new(store: Arc<DataStore>) -> Self {
        Self { store }
    }

    pub async fn get(&self, id: &str) -> Result<Option<ApiStudioDraft>, ApiStudioError> {
        read_json(&self.store.api_studio_draft_path(id))
            .await
            .map_err(storage_err)
    }

    pub async fn save(&self, id: &str, req: SaveDraftRequest) -> Result<ApiStudioDraft, ApiStudioError> {
        let now = chrono::Utc::now().timestamp();
        let path = self.store.api_studio_draft_path(id);
        let draft = if path.exists() {
            let mut existing = read_json::<ApiStudioDraft>(&path)
                .await
                .map_err(storage_err)?
                .ok_or_else(|| ApiStudioError::NotFound(format!("draft {id}")))?;
            existing.name = req.name;
            existing.method = req.method;
            existing.url = req.url;
            existing.query_params = req.query_params;
            existing.headers = req.headers;
            existing.body = req.body;
            existing.cookies = req.cookies;
            existing.settings = req.settings;
            existing.timeout = req.timeout;
            existing.updated_at = now;
            existing
        } else {
            ApiStudioDraft {
                id: id.to_string(),
                name: req.name,
                method: req.method,
                url: req.url,
                query_params: req.query_params,
                headers: req.headers,
                body: req.body,
                cookies: req.cookies,
                settings: req.settings,
                timeout: req.timeout,
                created_at: now,
                updated_at: now,
            }
        };

        write_json_atomic(&path, &draft)
            .await
            .map_err(storage_err)?;
        Ok(draft)
    }

    pub async fn create_default(&self, name: impl Into<String>) -> Result<ApiStudioDraft, ApiStudioError> {
        let id = new_id();
        self.save(
            &id,
            SaveDraftRequest {
                name: name.into(),
                method: HttpMethod::default(),
                url: String::new(),
                query_params: Vec::new(),
                headers: Vec::new(),
                body: String::new(),
                cookies: Vec::new(),
                settings: RequestSettings::default(),
                timeout: Some(30),
            },
        )
        .await
    }

    pub async fn delete(&self, id: &str) -> Result<bool, ApiStudioError> {
        let path = self.store.api_studio_draft_path(id);
        if !path.exists() {
            return Ok(false);
        }
        tokio::fs::remove_file(&path)
            .await
            .map_err(storage_err)?;
        Ok(true)
    }
}
