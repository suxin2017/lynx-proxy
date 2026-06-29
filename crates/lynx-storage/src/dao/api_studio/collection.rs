use std::sync::Arc;

use serde::{Deserialize, Serialize};

use crate::dao::api_studio::draft::{DraftStore, SaveDraftRequest};
use crate::dao::api_studio::error::{ApiStudioError, storage as storage_err};
use crate::dao::api_studio::ids::new_id;
use crate::models::api_studio::{CollectionKind, CollectionNode, HttpMethod};
use crate::storage::{DataStore, read_json_or_default, write_json_atomic};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CollectionFile {
    pub nodes: Vec<CollectionNode>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCollectionNode {
    pub kind: CollectionKind,
    pub name: String,
    pub parent_id: Option<String>,
    pub method: Option<HttpMethod>,
    #[serde(default)]
    pub draft: Option<SaveDraftRequest>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameCollectionNode {
    pub name: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MoveCollectionNode {
    pub new_parent_id: Option<String>,
    pub before_sibling_id: Option<String>,
}

#[derive(Clone)]
pub struct CollectionStore {
    store: Arc<DataStore>,
    drafts: DraftStore,
}

impl CollectionStore {
    pub fn new(store: Arc<DataStore>) -> Self {
        let drafts = DraftStore::new(store.clone());
        Self { store, drafts }
    }

    async fn load(&self) -> Result<CollectionFile, ApiStudioError> {
        read_json_or_default(&self.store.api_studio_collection_path())
            .await
            .map_err(storage_err)
    }

    async fn save(&self, file: &CollectionFile) -> Result<(), ApiStudioError> {
        write_json_atomic(&self.store.api_studio_collection_path(), file)
            .await
            .map_err(storage_err)
    }

    pub async fn list_flat(&self) -> Result<Vec<CollectionNode>, ApiStudioError> {
        let file = self.load().await?;
        let mut nodes = file.nodes;
        nodes.sort_by(|a, b| {
            a.parent_id.cmp(&b.parent_id).then_with(|| {
                a.order
                    .unwrap_or(0)
                    .cmp(&b.order.unwrap_or(0))
                    .then_with(|| a.name.cmp(&b.name))
            })
        });
        Ok(nodes)
    }

    fn find_node<'a>(file: &'a CollectionFile, id: &str) -> Option<&'a CollectionNode> {
        file.nodes.iter().find(|n| n.id == id)
    }

    fn max_order(file: &CollectionFile, parent_id: &Option<String>) -> i32 {
        file.nodes
            .iter()
            .filter(|n| &n.parent_id == parent_id)
            .filter_map(|n| n.order)
            .max()
            .unwrap_or(-1)
    }

    fn validate_parent_kind(
        file: &CollectionFile,
        kind: &CollectionKind,
        parent_id: &Option<String>,
    ) -> Result<(), ApiStudioError> {
        match (kind, parent_id) {
            (CollectionKind::Collection, None) => Ok(()),
            (CollectionKind::Collection, Some(_)) => Err(ApiStudioError::Validation(
                "collection nodes must be at the root".into(),
            )),
            (CollectionKind::Folder | CollectionKind::Request, None) => Err(
                ApiStudioError::Validation("folder and request nodes require a parent".into()),
            ),
            (CollectionKind::Folder | CollectionKind::Request, Some(pid)) => {
                let Some(parent) = Self::find_node(file, pid) else {
                    return Err(ApiStudioError::NotFound(format!("parent node {pid}")));
                };
                match parent.kind {
                    CollectionKind::Collection | CollectionKind::Folder => Ok(()),
                    CollectionKind::Request => Err(ApiStudioError::Validation(
                        "cannot nest under a request node".into(),
                    )),
                }
            }
        }
    }

    fn would_create_cycle(file: &CollectionFile, node_id: &str, target_parent_id: &str) -> bool {
        if node_id == target_parent_id {
            return true;
        }
        let mut current = Some(target_parent_id);
        while let Some(id) = current {
            if id == node_id {
                return true;
            }
            current = Self::find_node(file, id).and_then(|n| n.parent_id.as_deref());
        }
        false
    }

    fn shift_sibling_orders(
        nodes: &mut [CollectionNode],
        parent_id: &Option<String>,
        from_order: i32,
        delta: i32,
    ) {
        let now = chrono::Utc::now().timestamp_millis();
        for node in nodes.iter_mut() {
            if &node.parent_id == parent_id
                && let Some(order) = node.order
                && order >= from_order
            {
                node.order = Some(order + delta);
                node.updated_at = now;
            }
        }
    }

    pub async fn create(
        &self,
        req: CreateCollectionNode,
    ) -> Result<CollectionNode, ApiStudioError> {
        let mut file = self.load().await?;
        Self::validate_parent_kind(&file, &req.kind, &req.parent_id)?;

        if let Some(parent_id) = &req.parent_id
            && Self::find_node(&file, parent_id).is_none()
        {
            return Err(ApiStudioError::NotFound(format!("parent node {parent_id}")));
        }

        let id = new_id();
        let now = chrono::Utc::now().timestamp_millis();
        let order = Self::max_order(&file, &req.parent_id) + 1;

        let (draft_id, method) = if req.kind == CollectionKind::Request {
            let draft = if let Some(draft_req) = req.draft {
                let draft_id = new_id();
                self.drafts.save(&draft_id, draft_req).await?
            } else {
                self.drafts.create_default(req.name.clone()).await?
            };
            (Some(draft.id), req.method.or(Some(draft.method)))
        } else {
            (None, None)
        };

        let node = CollectionNode {
            id,
            parent_id: req.parent_id,
            kind: req.kind,
            name: req.name,
            method,
            draft_id,
            order: Some(order),
            created_at: now,
            updated_at: now,
        };

        file.nodes.push(node.clone());
        self.save(&file).await?;
        Ok(node)
    }

    pub async fn rename(
        &self,
        id: &str,
        req: RenameCollectionNode,
    ) -> Result<CollectionNode, ApiStudioError> {
        let mut file = self.load().await?;
        let Some(node) = file.nodes.iter_mut().find(|n| n.id == id) else {
            return Err(ApiStudioError::NotFound(format!("node {id}")));
        };
        node.name = req.name;
        node.updated_at = chrono::Utc::now().timestamp_millis();
        let updated = node.clone();
        self.save(&file).await?;
        Ok(updated)
    }

    pub async fn r#move(
        &self,
        id: &str,
        req: MoveCollectionNode,
    ) -> Result<CollectionNode, ApiStudioError> {
        let mut file = self.load().await?;
        let Some(node_kind) = Self::find_node(&file, id).map(|n| n.kind.clone()) else {
            return Err(ApiStudioError::NotFound(format!("node {id}")));
        };

        if node_kind == CollectionKind::Collection {
            return Err(ApiStudioError::Validation(
                "collection nodes cannot be moved".into(),
            ));
        }

        if let Some(parent_id) = &req.new_parent_id {
            if Self::find_node(&file, parent_id).is_none() {
                return Err(ApiStudioError::NotFound(format!("parent node {parent_id}")));
            }
            if Self::would_create_cycle(&file, id, parent_id) {
                return Err(ApiStudioError::Validation(
                    "move would create a cycle".into(),
                ));
            }
            Self::validate_parent_kind(&file, &node_kind, &req.new_parent_id)?;
        } else {
            return Err(ApiStudioError::Validation(
                "folder and request nodes require a parent".into(),
            ));
        }

        let (old_parent, old_order) = {
            let node = Self::find_node(&file, id).unwrap();
            (node.parent_id.clone(), node.order.unwrap_or(0))
        };

        let new_parent = req.new_parent_id.clone();
        let new_order = if let Some(before_id) = &req.before_sibling_id {
            let before_order = Self::find_node(&file, before_id)
                .ok_or_else(|| ApiStudioError::NotFound(format!("sibling node {before_id}")))?
                .order
                .unwrap_or(0);
            if Self::find_node(&file, before_id).map(|n| n.parent_id.as_ref())
                != Some(new_parent.as_ref())
            {
                return Err(ApiStudioError::Validation(
                    "beforeSiblingId must share the same parent".into(),
                ));
            }
            Self::shift_sibling_orders(&mut file.nodes, &new_parent, before_order, 1);
            before_order
        } else {
            Self::max_order(&file, &new_parent) + 1
        };

        if old_parent != new_parent || old_order < new_order {
            Self::shift_sibling_orders(&mut file.nodes, &old_parent, old_order + 1, -1);
        } else if old_order > new_order {
            Self::shift_sibling_orders(&mut file.nodes, &old_parent, new_order, 1);
        }

        let node = file
            .nodes
            .iter_mut()
            .find(|n| n.id == id)
            .expect("node exists");
        node.parent_id = new_parent;
        node.order = Some(new_order);
        node.updated_at = chrono::Utc::now().timestamp_millis();
        let updated = node.clone();
        self.save(&file).await?;
        Ok(updated)
    }

    async fn delete_subtree(
        &self,
        file: &mut CollectionFile,
        id: &str,
    ) -> Result<(), ApiStudioError> {
        let children: Vec<String> = file
            .nodes
            .iter()
            .filter(|n| n.parent_id.as_deref() == Some(id))
            .map(|n| n.id.clone())
            .collect();

        for child_id in children {
            Box::pin(self.delete_subtree(file, &child_id)).await?;
        }

        if let Some(node) = file.nodes.iter().find(|n| n.id == id)
            && let Some(draft_id) = &node.draft_id
        {
            let _ = self.drafts.delete(draft_id).await?;
        }

        file.nodes.retain(|n| n.id != id);
        Ok(())
    }

    pub async fn delete(&self, id: &str) -> Result<bool, ApiStudioError> {
        let mut file = self.load().await?;
        if Self::find_node(&file, id).is_none() {
            return Ok(false);
        }
        self.delete_subtree(&mut file, id).await?;
        self.save(&file).await?;
        Ok(true)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::api_studio::CollectionKind;
    use crate::storage::DataStore;

    async fn setup() -> (ApiStudioStore, tempfile::TempDir) {
        let dir = tempfile::tempdir().unwrap();
        let store = DataStore::new(dir.path()).await.unwrap();
        (ApiStudioStore::new(store), dir)
    }

    use crate::dao::api_studio::ApiStudioStore;

    #[tokio::test]
    async fn create_collection_folder_request() {
        let (studio, _dir) = setup().await;

        let col = studio
            .create_collection_node(CreateCollectionNode {
                kind: CollectionKind::Collection,
                name: "My APIs".into(),
                parent_id: None,
                method: None,
                draft: None,
            })
            .await
            .unwrap();
        assert_eq!(col.kind, CollectionKind::Collection);

        let folder = studio
            .create_collection_node(CreateCollectionNode {
                kind: CollectionKind::Folder,
                name: "Auth".into(),
                parent_id: Some(col.id.clone()),
                method: None,
                draft: None,
            })
            .await
            .unwrap();

        let req = studio
            .create_collection_node(CreateCollectionNode {
                kind: CollectionKind::Request,
                name: "Login".into(),
                parent_id: Some(folder.id),
                method: Some(HttpMethod::Post),
                draft: None,
            })
            .await
            .unwrap();
        assert!(req.draft_id.is_some());

        let nodes = studio.list_collection_nodes().await.unwrap();
        assert_eq!(nodes.len(), 3);
    }
}
