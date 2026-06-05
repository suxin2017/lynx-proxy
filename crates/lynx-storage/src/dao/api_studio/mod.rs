mod collection;
mod draft;
mod error;
mod history;
mod ids;

pub use collection::{
    CollectionFile, CollectionStore, CreateCollectionNode, MoveCollectionNode, RenameCollectionNode,
};
pub use draft::{DraftStore, SaveDraftRequest};
pub use error::ApiStudioError;
pub use history::{CreateHistoryEntry, HistoryListParams, HistoryStore};
pub use ids::new_id;

use std::sync::Arc;

use crate::models::api_studio::{ApiStudioDraft, CollectionNode, HistoryEntry};
use crate::storage::DataStore;

/// Facade over API Studio persistence (collections, drafts, history).
#[derive(Clone)]
pub struct ApiStudioStore {
    collections: CollectionStore,
    drafts: DraftStore,
    history: HistoryStore,
}

impl ApiStudioStore {
    pub fn new(store: Arc<DataStore>) -> Self {
        Self {
            collections: CollectionStore::new(store.clone()),
            drafts: DraftStore::new(store.clone()),
            history: HistoryStore::new(store),
        }
    }

    pub async fn list_collection_nodes(&self) -> Result<Vec<CollectionNode>, ApiStudioError> {
        self.collections.list_flat().await
    }

    pub async fn create_collection_node(
        &self,
        req: CreateCollectionNode,
    ) -> Result<CollectionNode, ApiStudioError> {
        self.collections.create(req).await
    }

    pub async fn rename_collection_node(
        &self,
        id: &str,
        req: RenameCollectionNode,
    ) -> Result<CollectionNode, ApiStudioError> {
        self.collections.rename(id, req).await
    }

    pub async fn move_collection_node(
        &self,
        id: &str,
        req: MoveCollectionNode,
    ) -> Result<CollectionNode, ApiStudioError> {
        self.collections.r#move(id, req).await
    }

    pub async fn delete_collection_node(&self, id: &str) -> Result<bool, ApiStudioError> {
        self.collections.delete(id).await
    }

    pub async fn get_draft(&self, id: &str) -> Result<Option<ApiStudioDraft>, ApiStudioError> {
        self.drafts.get(id).await
    }

    pub async fn save_draft(
        &self,
        id: &str,
        req: SaveDraftRequest,
    ) -> Result<ApiStudioDraft, ApiStudioError> {
        self.drafts.save(id, req).await
    }

    pub async fn delete_draft(&self, id: &str) -> Result<bool, ApiStudioError> {
        self.drafts.delete(id).await
    }

    pub async fn list_history(
        &self,
        params: HistoryListParams,
    ) -> Result<Vec<HistoryEntry>, ApiStudioError> {
        self.history.list(params).await
    }

    pub async fn append_history(
        &self,
        req: CreateHistoryEntry,
    ) -> Result<HistoryEntry, ApiStudioError> {
        self.history.append(req).await
    }

    pub async fn delete_history_entry(&self, id: &str) -> Result<bool, ApiStudioError> {
        self.history.delete(id).await
    }

    pub async fn clear_history(&self) -> Result<u64, ApiStudioError> {
        self.history.clear_all().await
    }
}
