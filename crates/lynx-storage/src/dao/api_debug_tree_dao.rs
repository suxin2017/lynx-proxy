use crate::models::NodeType;
use crate::storage::{DataStore, TreeFile, TreeNodeRecord, read_json_or_default, write_json_atomic};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CreateFolderRequest {
    pub name: String,
    pub parent_id: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CreateRequestNodeRequest {
    pub name: String,
    pub parent_id: Option<i32>,
    pub api_debug_id: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MoveNodeRequest {
    pub target_parent_id: Option<i32>,
    pub new_sort_order: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RenameNodeRequest {
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TreeNodeResponse {
    pub id: i32,
    pub name: String,
    pub node_type: NodeType,
    pub parent_id: Option<i32>,
    pub api_debug_id: Option<i32>,
    pub sort_order: i32,
    pub created_at: i64,
    pub updated_at: i64,
    pub children: Option<Vec<TreeNodeResponse>>,
}

impl From<TreeNodeRecord> for TreeNodeResponse {
    fn from(record: TreeNodeRecord) -> Self {
        Self {
            id: record.id,
            name: record.name,
            node_type: record.node_type,
            parent_id: record.parent_id,
            api_debug_id: record.api_debug_id,
            sort_order: record.sort_order,
            created_at: record.created_at,
            updated_at: record.updated_at,
            children: None,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TreeResponse {
    pub nodes: Vec<TreeNodeResponse>,
}

pub struct ApiDebugTreeDao {
    store: Arc<DataStore>,
}

impl ApiDebugTreeDao {
    pub fn new(store: Arc<DataStore>) -> Self {
        Self { store }
    }

    async fn load_tree(&self) -> Result<TreeFile> {
        read_json_or_default(&self.store.tree_path()).await
    }

    async fn save_tree(&self, tree: &TreeFile) -> Result<()> {
        write_json_atomic(&self.store.tree_path(), tree).await
    }

    fn find_node<'a>(tree: &'a TreeFile, id: i32) -> Option<&'a TreeNodeRecord> {
        tree.nodes.iter().find(|n| n.id == id)
    }

    fn find_node_mut<'a>(tree: &'a mut TreeFile, id: i32) -> Option<&'a mut TreeNodeRecord> {
        tree.nodes.iter_mut().find(|n| n.id == id)
    }

    fn max_sort_order(tree: &TreeFile, parent_id: Option<i32>) -> i32 {
        tree.nodes
            .iter()
            .filter(|n| n.parent_id == parent_id)
            .map(|n| n.sort_order)
            .max()
            .unwrap_or(0)
    }

    pub async fn create_folder(&self, req: CreateFolderRequest) -> Result<TreeNodeResponse> {
        let mut tree = self.load_tree().await?;
        let sort_order = Self::max_sort_order(&tree, req.parent_id) + 1;
        let id = self.store.next_tree_node_id().await?;
        let now = chrono::Utc::now().timestamp();
        let record = TreeNodeRecord {
            id,
            name: req.name,
            node_type: NodeType::Folder,
            parent_id: req.parent_id,
            api_debug_id: None,
            sort_order,
            created_at: now,
            updated_at: now,
        };
        let response = TreeNodeResponse::from(record.clone());
        tree.nodes.push(record);
        self.save_tree(&tree).await?;
        Ok(response)
    }

    pub async fn create_request_node(
        &self,
        req: CreateRequestNodeRequest,
    ) -> Result<TreeNodeResponse> {
        let mut tree = self.load_tree().await?;
        let sort_order = Self::max_sort_order(&tree, req.parent_id) + 1;
        let id = self.store.next_tree_node_id().await?;
        let now = chrono::Utc::now().timestamp();
        let record = TreeNodeRecord {
            id,
            name: req.name,
            node_type: NodeType::Request,
            parent_id: req.parent_id,
            api_debug_id: Some(req.api_debug_id),
            sort_order,
            created_at: now,
            updated_at: now,
        };
        let response = TreeNodeResponse::from(record.clone());
        tree.nodes.push(record);
        self.save_tree(&tree).await?;
        Ok(response)
    }

    pub async fn get_node(&self, id: i32) -> Result<Option<TreeNodeResponse>> {
        let tree = self.load_tree().await?;
        Ok(Self::find_node(&tree, id).cloned().map(TreeNodeResponse::from))
    }

    pub async fn get_children(&self, parent_id: Option<i32>) -> Result<Vec<TreeNodeResponse>> {
        let tree = self.load_tree().await?;
        let mut children: Vec<TreeNodeResponse> = tree
            .nodes
            .iter()
            .filter(|n| n.parent_id == parent_id)
            .cloned()
            .map(TreeNodeResponse::from)
            .collect();
        children.sort_by_key(|n| n.sort_order);
        Ok(children)
    }

    pub async fn get_tree(&self) -> Result<TreeResponse> {
        let root_nodes = self.get_children(None).await?;
        let mut tree_nodes = Vec::new();

        for mut node in root_nodes {
            self.populate_children(&mut node).await?;
            tree_nodes.push(node);
        }

        Ok(TreeResponse { nodes: tree_nodes })
    }

    async fn populate_children(&self, node: &mut TreeNodeResponse) -> Result<()> {
        let children = self.get_children(Some(node.id)).await?;
        let mut populated_children = Vec::new();

        for mut child in children {
            Box::pin(self.populate_children(&mut child)).await?;
            populated_children.push(child);
        }

        node.children = Some(populated_children);
        Ok(())
    }

    pub async fn move_node(
        &self,
        id: i32,
        req: MoveNodeRequest,
    ) -> Result<Option<TreeNodeResponse>> {
        let mut tree = self.load_tree().await?;

        if Self::find_node(&tree, id).is_none() {
            return Ok(None);
        }

        if let Some(target_parent_id) = req.target_parent_id {
            if Self::would_create_cycle(&tree, id, target_parent_id) {
                return Err(anyhow::anyhow!("移动操作会造成循环引用"));
            }
        }

        let (original_parent_id, original_sort_order) = {
            let node = Self::find_node(&tree, id).unwrap();
            (node.parent_id, node.sort_order)
        };
        let target_parent_id = req.target_parent_id;

        if original_parent_id != target_parent_id {
            Self::adjust_sort_order_after_removal(&mut tree, original_parent_id, original_sort_order);
            let target_sort_order = if let Some(order) = req.new_sort_order {
                Self::adjust_sort_order_for_insertion(&mut tree, target_parent_id, order);
                order
            } else {
                Self::max_sort_order(&tree, target_parent_id) + 1
            };

            if let Some(node) = Self::find_node_mut(&mut tree, id) {
                node.parent_id = target_parent_id;
                node.sort_order = target_sort_order;
                node.updated_at = chrono::Utc::now().timestamp();
            }
        } else if let Some(new_sort_order) = req.new_sort_order {
            if new_sort_order != original_sort_order {
                Self::handle_same_parent_move(
                    &mut tree,
                    id,
                    original_parent_id,
                    original_sort_order,
                    new_sort_order,
                );
            }
        }

        self.save_tree(&tree).await?;
        Ok(self.get_node(id).await?)
    }

    fn would_create_cycle(tree: &TreeFile, node_id: i32, target_parent_id: i32) -> bool {
        if node_id == target_parent_id {
            return true;
        }

        let mut current_id = Some(target_parent_id);
        while let Some(id) = current_id {
            if id == node_id {
                return true;
            }
            current_id = Self::find_node(tree, id).and_then(|n| n.parent_id);
        }
        false
    }

    pub async fn rename_node(
        &self,
        id: i32,
        req: RenameNodeRequest,
    ) -> Result<Option<TreeNodeResponse>> {
        let mut tree = self.load_tree().await?;
        if Self::find_node(&tree, id).is_some() {
            if let Some(node) = Self::find_node_mut(&mut tree, id) {
                node.name = req.name;
                node.updated_at = chrono::Utc::now().timestamp();
            }
            self.save_tree(&tree).await?;
            Ok(self.get_node(id).await?)
        } else {
            Ok(None)
        }
    }

    pub async fn delete_node(&self, id: i32) -> Result<bool> {
        let children = self.get_children(Some(id)).await?;
        for child in children {
            Box::pin(self.delete_node(child.id)).await?;
        }

        let mut tree = self.load_tree().await?;
        let before = tree.nodes.len();
        tree.nodes.retain(|n| n.id != id);
        let deleted = tree.nodes.len() < before;
        if deleted {
            self.save_tree(&tree).await?;
        }
        Ok(deleted)
    }

    fn adjust_sort_order_after_removal(
        tree: &mut TreeFile,
        parent_id: Option<i32>,
        removed_sort_order: i32,
    ) {
        let now = chrono::Utc::now().timestamp();
        for node in tree.nodes.iter_mut() {
            if node.parent_id == parent_id && node.sort_order > removed_sort_order {
                node.sort_order -= 1;
                node.updated_at = now;
            }
        }
    }

    fn adjust_sort_order_for_insertion(
        tree: &mut TreeFile,
        parent_id: Option<i32>,
        insert_position: i32,
    ) {
        let now = chrono::Utc::now().timestamp();
        for node in tree.nodes.iter_mut() {
            if node.parent_id == parent_id && node.sort_order >= insert_position {
                node.sort_order += 1;
                node.updated_at = now;
            }
        }
    }

    fn handle_same_parent_move(
        tree: &mut TreeFile,
        node_id: i32,
        parent_id: Option<i32>,
        original_sort_order: i32,
        new_sort_order: i32,
    ) {
        if original_sort_order < new_sort_order {
            Self::shift_nodes_forward(tree, parent_id, original_sort_order + 1, new_sort_order);
        } else {
            Self::shift_nodes_backward(tree, parent_id, new_sort_order, original_sort_order - 1);
        }

        if let Some(node) = Self::find_node_mut(tree, node_id) {
            node.sort_order = new_sort_order;
            node.updated_at = chrono::Utc::now().timestamp();
        }
    }

    fn shift_nodes_forward(
        tree: &mut TreeFile,
        parent_id: Option<i32>,
        start_order: i32,
        end_order: i32,
    ) {
        let now = chrono::Utc::now().timestamp();
        for node in tree.nodes.iter_mut() {
            if node.parent_id == parent_id
                && node.sort_order >= start_order
                && node.sort_order <= end_order
            {
                node.sort_order -= 1;
                node.updated_at = now;
            }
        }
    }

    fn shift_nodes_backward(
        tree: &mut TreeFile,
        parent_id: Option<i32>,
        start_order: i32,
        end_order: i32,
    ) {
        let now = chrono::Utc::now().timestamp();
        for node in tree.nodes.iter_mut() {
            if node.parent_id == parent_id
                && node.sort_order >= start_order
                && node.sort_order <= end_order
            {
                node.sort_order += 1;
                node.updated_at = now;
            }
        }
    }

    pub async fn reorder_nodes(
        &self,
        parent_id: Option<i32>,
        node_orders: Vec<(i32, i32)>,
    ) -> Result<()> {
        let mut tree = self.load_tree().await?;
        let now = chrono::Utc::now().timestamp();

        for (node_id, new_order) in node_orders {
            if let Some(node) = Self::find_node_mut(&mut tree, node_id) {
                if node.parent_id == parent_id {
                    node.sort_order = new_order;
                    node.updated_at = now;
                }
            }
        }

        self.save_tree(&tree).await
    }

    pub async fn get_node_path(&self, id: i32) -> Result<Vec<TreeNodeResponse>> {
        let tree = self.load_tree().await?;
        let mut path = Vec::new();
        let mut current_id = Some(id);

        while let Some(node_id) = current_id {
            if let Some(node) = Self::find_node(&tree, node_id) {
                current_id = node.parent_id;
                path.insert(0, TreeNodeResponse::from(node.clone()));
            } else {
                break;
            }
        }

        Ok(path)
    }

    pub async fn search_nodes(&self, keyword: &str) -> Result<Vec<TreeNodeResponse>> {
        let tree = self.load_tree().await?;
        let keyword_lower = keyword.to_lowercase();
        let mut results: Vec<TreeNodeResponse> = tree
            .nodes
            .iter()
            .filter(|n| n.name.to_lowercase().contains(&keyword_lower))
            .cloned()
            .map(TreeNodeResponse::from)
            .collect();
        results.sort_by(|a, b| a.name.cmp(&b.name));
        Ok(results)
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
    async fn test_create_folder() {
        let (store, _dir) = setup_store().await;
        let dao = ApiDebugTreeDao::new(store);

        let req = CreateFolderRequest {
            name: "测试文件夹".to_string(),
            parent_id: None,
        };

        let result = dao.create_folder(req).await.unwrap();
        assert_eq!(result.name, "测试文件夹");
        assert_eq!(result.node_type, NodeType::Folder);
        assert_eq!(result.parent_id, None);
        assert_eq!(result.sort_order, 1);
    }

    #[tokio::test]
    async fn test_create_request_node() {
        let (store, _dir) = setup_store().await;
        let dao = ApiDebugTreeDao::new(store);

        let req = CreateRequestNodeRequest {
            name: "测试请求".to_string(),
            parent_id: None,
            api_debug_id: 123,
        };

        let result = dao.create_request_node(req).await.unwrap();
        assert_eq!(result.name, "测试请求");
        assert_eq!(result.node_type, NodeType::Request);
        assert_eq!(result.api_debug_id, Some(123));
        assert_eq!(result.sort_order, 1);
    }
}
