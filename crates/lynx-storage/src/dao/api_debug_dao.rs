use crate::models::{HttpMethod, RequestStatus};
use crate::storage::{DataStore, read_json, write_json_atomic};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use std::sync::Arc;
use tokio::fs;
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CreateApiDebugRequest {
    pub name: String,
    pub method: HttpMethod,
    pub url: String,
    pub headers: Option<JsonValue>,
    pub body: Option<String>,
    pub content_type: Option<String>,
    pub timeout: Option<i32>,
    pub is_history: bool,
}

#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
#[serde(rename_all = "camelCase")]
pub struct UpdateApiDebugRequest {
    pub name: Option<String>,
    pub method: Option<HttpMethod>,
    pub url: Option<String>,
    pub headers: Option<JsonValue>,
    pub body: Option<String>,
    pub content_type: Option<String>,
    pub timeout: Option<i32>,
    pub status: Option<RequestStatus>,
    pub response_status: Option<i32>,
    pub response_headers: Option<JsonValue>,
    pub response_body: Option<String>,
    pub response_time: Option<i32>,
    pub error_message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ApiDebugResponse {
    pub id: i32,
    pub name: String,
    pub method: HttpMethod,
    pub url: String,
    pub headers: Option<JsonValue>,
    pub body: Option<String>,
    pub content_type: Option<String>,
    pub timeout: Option<i32>,
    pub status: RequestStatus,
    pub response_status: Option<i32>,
    pub response_headers: Option<JsonValue>,
    pub response_body: Option<String>,
    pub response_time: Option<i32>,
    pub error_message: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
    pub is_history: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ApiDebugRecord {
    pub id: i32,
    pub name: String,
    pub method: HttpMethod,
    pub url: String,
    pub headers: Option<JsonValue>,
    pub body: Option<String>,
    pub content_type: Option<String>,
    pub timeout: Option<i32>,
    pub status: RequestStatus,
    pub response_status: Option<i32>,
    pub response_headers: Option<JsonValue>,
    pub response_body: Option<String>,
    pub response_time: Option<i32>,
    pub error_message: Option<String>,
    pub is_history: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

impl From<ApiDebugRecord> for ApiDebugResponse {
    fn from(record: ApiDebugRecord) -> Self {
        Self {
            id: record.id,
            name: record.name,
            method: record.method,
            url: record.url,
            headers: record.headers,
            body: record.body,
            content_type: record.content_type,
            timeout: record.timeout,
            status: record.status,
            response_status: record.response_status,
            response_headers: record.response_headers,
            response_body: record.response_body,
            response_time: record.response_time,
            error_message: record.error_message,
            created_at: record.created_at,
            updated_at: record.updated_at,
            is_history: record.is_history,
        }
    }
}

impl ApiDebugRecord {
    fn from_create(req: CreateApiDebugRequest, id: i32) -> Self {
        let now = chrono::Utc::now().timestamp();
        Self {
            id,
            name: req.name,
            method: req.method,
            url: req.url,
            headers: req.headers,
            body: req.body,
            content_type: req.content_type,
            timeout: req.timeout,
            status: RequestStatus::Pending,
            response_status: None,
            response_headers: None,
            response_body: None,
            response_time: None,
            error_message: None,
            is_history: req.is_history,
            created_at: now,
            updated_at: now,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ApiDebugQueryParams {
    pub page: Option<u64>,
    pub per_page: Option<u64>,
    pub method: Option<HttpMethod>,
    pub status: Option<RequestStatus>,
    pub search: Option<String>,
    pub is_history: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ApiDebugListResponse {
    pub data: Vec<ApiDebugResponse>,
    pub total: u64,
    pub page: u64,
    pub per_page: u64,
    pub total_pages: u64,
}

pub struct ApiDebugDao {
    store: Arc<DataStore>,
}

impl ApiDebugDao {
    pub fn new(store: Arc<DataStore>) -> Self {
        Self { store }
    }

    async fn load_all(&self) -> Result<Vec<ApiDebugRecord>> {
        let dir = self.store.api_debug_requests_dir();
        let mut records = Vec::new();
        let mut entries = fs::read_dir(&dir).await?;
        while let Some(entry) = entries.next_entry().await? {
            let path = entry.path();
            if let Some(record) = read_json::<ApiDebugRecord>(&path).await? {
                records.push(record);
            }
        }
        records.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        Ok(records)
    }

    async fn save(&self, record: &ApiDebugRecord) -> Result<()> {
        write_json_atomic(&self.store.api_debug_request_path(record.id), record).await
    }

    pub async fn create(&self, req: CreateApiDebugRequest) -> Result<ApiDebugResponse> {
        let id = self.store.next_api_debug_id().await?;
        let record = ApiDebugRecord::from_create(req, id);
        self.save(&record).await?;
        Ok(record.into())
    }

    pub async fn get_by_id(&self, id: i32) -> Result<Option<ApiDebugResponse>> {
        read_json::<ApiDebugRecord>(&self.store.api_debug_request_path(id))
            .await
            .map(|opt| opt.map(Into::into))
    }

    pub async fn update(
        &self,
        id: i32,
        req: UpdateApiDebugRequest,
    ) -> Result<Option<ApiDebugResponse>> {
        let Some(mut record) =
            read_json::<ApiDebugRecord>(&self.store.api_debug_request_path(id)).await?
        else {
            return Ok(None);
        };

        if let Some(name) = req.name {
            record.name = name;
        }
        if let Some(method) = req.method {
            record.method = method;
        }
        if let Some(url) = req.url {
            record.url = url;
        }
        if let Some(headers) = req.headers {
            record.headers = Some(headers);
        }
        if let Some(body) = req.body {
            record.body = Some(body);
        }
        if let Some(content_type) = req.content_type {
            record.content_type = Some(content_type);
        }
        if let Some(timeout) = req.timeout {
            record.timeout = Some(timeout);
        }
        if let Some(status) = req.status {
            record.status = status;
        }
        if let Some(response_status) = req.response_status {
            record.response_status = Some(response_status);
        }
        if let Some(response_headers) = req.response_headers {
            record.response_headers = Some(response_headers);
        }
        if let Some(response_body) = req.response_body {
            record.response_body = Some(response_body);
        }
        if let Some(response_time) = req.response_time {
            record.response_time = Some(response_time);
        }
        if let Some(error_message) = req.error_message {
            record.error_message = Some(error_message);
        }

        record.updated_at = chrono::Utc::now().timestamp();
        self.save(&record).await?;
        Ok(Some(record.into()))
    }

    pub async fn delete(&self, id: i32) -> Result<bool> {
        let path = self.store.api_debug_request_path(id);
        if path.exists() {
            fs::remove_file(&path).await?;
            Ok(true)
        } else {
            Ok(false)
        }
    }

    pub async fn list(&self, params: ApiDebugQueryParams) -> Result<ApiDebugListResponse> {
        let page = params.page.unwrap_or(1);
        let per_page = params.per_page.unwrap_or(20).min(100);

        let mut records = self.load_all().await?;

        if let Some(method) = params.method {
            records.retain(|r| r.method == method);
        }
        if let Some(status) = params.status {
            records.retain(|r| r.status == status);
        }
        if let Some(is_history) = params.is_history {
            records.retain(|r| r.is_history == is_history);
        }
        if let Some(search) = params.search {
            let search_lower = search.to_lowercase();
            records.retain(|r| {
                r.name.to_lowercase().contains(&search_lower)
                    || r.url.to_lowercase().contains(&search_lower)
            });
        }

        let total = records.len() as u64;
        let start = ((page - 1) * per_page) as usize;
        let end = (start + per_page as usize).min(records.len());
        let page_records = if start < records.len() {
            &records[start..end]
        } else {
            &[][..]
        };

        let data = page_records
            .iter()
            .cloned()
            .map(ApiDebugResponse::from)
            .collect();
        let total_pages = if per_page == 0 {
            0
        } else {
            (total + per_page - 1) / per_page
        };

        Ok(ApiDebugListResponse {
            data,
            total,
            page,
            per_page,
            total_pages,
        })
    }

    pub async fn get_recent(&self, limit: u64) -> Result<Vec<ApiDebugResponse>> {
        let records = self.load_all().await?;
        Ok(records
            .into_iter()
            .take(limit as usize)
            .map(Into::into)
            .collect())
    }

    pub async fn get_by_status(&self, status: RequestStatus) -> Result<Vec<ApiDebugResponse>> {
        let records = self.load_all().await?;
        Ok(records
            .into_iter()
            .filter(|r| r.status == status)
            .map(Into::into)
            .collect())
    }

    pub async fn get_stats(&self) -> Result<ApiDebugStats> {
        let records = self.load_all().await?;
        let total = records.len() as u64;
        let success_count = records
            .iter()
            .filter(|r| r.status == RequestStatus::Success)
            .count() as u64;
        let failed_count = records
            .iter()
            .filter(|r| r.status == RequestStatus::Failed)
            .count() as u64;
        let pending_count = records
            .iter()
            .filter(|r| r.status == RequestStatus::Pending)
            .count() as u64;

        Ok(ApiDebugStats {
            total,
            success_count,
            failed_count,
            pending_count,
        })
    }

    pub async fn clear_all(&self) -> Result<u64> {
        let records = self.load_all().await?;
        let mut deleted = 0u64;
        for record in records {
            if record.is_history {
                if self.delete(record.id).await? {
                    deleted += 1;
                }
            }
        }
        Ok(deleted)
    }
}

#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ApiDebugStats {
    pub total: u64,
    pub success_count: u64,
    pub failed_count: u64,
    pub pending_count: u64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::DataStore;
    use serde_json::json;

    async fn setup_store() -> (Arc<DataStore>, tempfile::TempDir) {
        let dir = tempfile::tempdir().unwrap();
        let store = DataStore::new(dir.path()).await.unwrap();
        (store, dir)
    }

    #[tokio::test]
    async fn test_create_api_debug() {
        let (store, _dir) = setup_store().await;
        let dao = ApiDebugDao::new(store);

        let req = CreateApiDebugRequest {
            name: "Test API".to_string(),
            method: HttpMethod::Get,
            url: "https://api.example.com/test".to_string(),
            headers: Some(json!({"Content-Type": "application/json"})),
            body: Some(r#"{"test": "data"}"#.to_string()),
            content_type: Some("application/json".to_string()),
            timeout: Some(30),
            is_history: false,
        };

        let result = dao.create(req).await.unwrap();
        assert_eq!(result.name, "Test API");
        assert_eq!(result.method, HttpMethod::Get);
        assert_eq!(result.status, RequestStatus::Pending);
    }

    #[tokio::test]
    async fn test_list_with_pagination() {
        let (store, _dir) = setup_store().await;
        let dao = ApiDebugDao::new(store);

        for i in 1..=25 {
            let req = CreateApiDebugRequest {
                name: format!("Test API {}", i),
                method: HttpMethod::Get,
                url: format!("https://api.example.com/test{}", i),
                headers: None,
                body: None,
                content_type: None,
                timeout: None,
                is_history: false,
            };
            dao.create(req).await.unwrap();
        }

        let params = ApiDebugQueryParams {
            page: Some(1),
            per_page: Some(10),
            method: None,
            status: None,
            search: None,
            is_history: None,
        };

        let result = dao.list(params).await.unwrap();
        assert_eq!(result.data.len(), 10);
        assert_eq!(result.total, 25);
        assert_eq!(result.total_pages, 3);
    }
}
