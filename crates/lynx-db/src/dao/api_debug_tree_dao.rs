use crate::entities::api_debug_tree::{self, ActiveModel, Entity, Model, NodeType};
use anyhow::Result;
use sea_orm::*;
use sea_orm::prelude::Expr;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use utoipa::ToSchema;



/// 创建文件夹节点请求
#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CreateFolderRequest {
    pub name: String,
    pub parent_id: Option<i32>,
}

/// 创建请求节点请求
#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CreateRequestNodeRequest {
    pub name: String,
    pub parent_id: Option<i32>,
    pub api_debug_id: i32,
}

/// 移动节点请求
#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MoveNodeRequest {
    pub target_parent_id: Option<i32>,
    pub new_sort_order: Option<i32>,
}

/// 重命名节点请求
#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RenameNodeRequest {
    pub name: String,
}

/// 树节点响应
#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
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
    #[schema(no_recursion)]
    pub children: Option<Vec<TreeNodeResponse>>,
}

impl From<Model> for TreeNodeResponse {
    fn from(model: Model) -> Self {
        Self {
            id: model.id,
            name: model.name,
            node_type: model.node_type,
            parent_id: model.parent_id,
            api_debug_id: model.api_debug_id,
            sort_order: model.sort_order,
            created_at: model.created_at,
            updated_at: model.updated_at,
            children: None, // 需要单独查询填充
        }
    }
}

/// 树形结构响应
#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TreeResponse {
    pub nodes: Vec<TreeNodeResponse>,
}

pub struct ApiDebugTreeDao {
    db: Arc<DatabaseConnection>,
}

impl ApiDebugTreeDao {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }

    /// 创建文件夹节点
    pub async fn create_folder(&self, req: CreateFolderRequest) -> Result<TreeNodeResponse> {
        // 获取同级节点的最大排序值
        let max_sort_order = self.get_max_sort_order(req.parent_id).await?;
        
        let active_model = Model::new_folder(req.name, req.parent_id, max_sort_order + 1);
        
        let result = Entity::insert(active_model)
            .exec_with_returning(self.db.as_ref())
            .await?;

        Ok(result.into())
    }

    /// 创建请求节点
    pub async fn create_request_node(&self, req: CreateRequestNodeRequest) -> Result<TreeNodeResponse> {
        // 获取同级节点的最大排序值
        let max_sort_order = self.get_max_sort_order(req.parent_id).await?;
        
        let active_model = Model::new_request(
            req.name,
            req.parent_id,
            req.api_debug_id,
            max_sort_order + 1,
        );
        
        let result = Entity::insert(active_model)
            .exec_with_returning(self.db.as_ref())
            .await?;

        Ok(result.into())
    }

    /// 获取指定父节点下的最大排序值
    async fn get_max_sort_order(&self, parent_id: Option<i32>) -> Result<i32> {
        let mut query = Entity::find();
        
        if let Some(pid) = parent_id {
            query = query.filter(api_debug_tree::Column::ParentId.eq(pid));
        } else {
            query = query.filter(api_debug_tree::Column::ParentId.is_null());
        }
        
        let max_order = query
            .select_only()
            .column_as(api_debug_tree::Column::SortOrder.max(), "max_order")
            .into_tuple::<Option<i32>>()
            .one(self.db.as_ref())
            .await?
            .flatten()
            .unwrap_or(0);
            
        Ok(max_order)
    }

    /// 获取节点详情
    pub async fn get_node(&self, id: i32) -> Result<Option<TreeNodeResponse>> {
        let model = Entity::find_by_id(id).one(self.db.as_ref()).await?;
        Ok(model.map(|m| m.into()))
    }

    /// 获取指定节点的子节点
    pub async fn get_children(&self, parent_id: Option<i32>) -> Result<Vec<TreeNodeResponse>> {
        let mut query = Entity::find();
        
        if let Some(pid) = parent_id {
            query = query.filter(api_debug_tree::Column::ParentId.eq(pid));
        } else {
            query = query.filter(api_debug_tree::Column::ParentId.is_null());
        }
        
        let models = query
            .order_by_asc(api_debug_tree::Column::SortOrder)
            .all(self.db.as_ref())
            .await?;

        Ok(models.into_iter().map(|m| m.into()).collect())
    }

    /// 获取完整树结构
    pub async fn get_tree(&self) -> Result<TreeResponse> {
        let root_nodes = self.get_children(None).await?;
        let mut tree_nodes = Vec::new();
        
        for mut node in root_nodes {
            self.populate_children(&mut node).await?;
            tree_nodes.push(node);
        }
        
        Ok(TreeResponse { nodes: tree_nodes })
    }

    /// 递归填充子节点
    async fn populate_children<'a>(&'a self, node: &'a mut TreeNodeResponse) -> Result<()> {
        let children = self.get_children(Some(node.id)).await?;
        let mut populated_children = Vec::new();
        
        for mut child in children {
            Box::pin(self.populate_children(&mut child)).await?;
            populated_children.push(child);
        }
        
        node.children = Some(populated_children);
        Ok(())
    }

    /// 移动节点
    pub async fn move_node(&self, id: i32, req: MoveNodeRequest) -> Result<Option<TreeNodeResponse>> {
        let model = Entity::find_by_id(id).one(self.db.as_ref()).await?;
        
        if let Some(model) = model {
            // 检查是否会造成循环引用
            if let Some(target_parent_id) = req.target_parent_id {
                if self.would_create_cycle(id, target_parent_id).await? {
                    return Err(anyhow::anyhow!("移动操作会造成循环引用"));
                }
            }
            
            let original_parent_id = model.parent_id;
            let original_sort_order = model.sort_order;
            let target_parent_id = req.target_parent_id;
            
            // 开启事务处理排序逻辑
            let txn = self.db.begin().await?;
            
            // 判断是否跨父节点移动
            let is_cross_parent_move = original_parent_id != target_parent_id;
            
            if is_cross_parent_move {
                // 跨父节点移动
                self.handle_cross_parent_move(
                    &txn, 
                    id, 
                    original_parent_id, 
                    original_sort_order,
                    target_parent_id, 
                    req.new_sort_order
                ).await?;
            } else {
                // 同父节点内移动
                if let Some(new_sort_order) = req.new_sort_order {
                    if new_sort_order != original_sort_order {
                        self.handle_same_parent_move(
                            &txn, 
                            id, 
                            original_parent_id, 
                            original_sort_order, 
                            new_sort_order
                        ).await?;
                    }
                }
            }
            
            txn.commit().await?;
            
            // 返回更新后的节点
            let updated_model = Entity::find_by_id(id).one(self.db.as_ref()).await?;
            Ok(updated_model.map(|m| m.into()))
        } else {
            Ok(None)
        }
    }

    /// 检查移动操作是否会造成循环引用
    async fn would_create_cycle(&self, node_id: i32, target_parent_id: i32) -> Result<bool> {
        if node_id == target_parent_id {
            return Ok(true);
        }
        
        let mut current_id = Some(target_parent_id);
        
        while let Some(id) = current_id {
            if id == node_id {
                return Ok(true);
            }
            
            let parent = Entity::find_by_id(id).one(self.db.as_ref()).await?;
            current_id = parent.and_then(|p| p.parent_id);
        }
        
        Ok(false)
    }

    /// 重命名节点
    pub async fn rename_node(&self, id: i32, req: RenameNodeRequest) -> Result<Option<TreeNodeResponse>> {
        let model = Entity::find_by_id(id).one(self.db.as_ref()).await?;
        
        if let Some(model) = model {
            let mut active_model: ActiveModel = model.into();
            active_model.name = Set(req.name);
            active_model.updated_at = Set(chrono::Utc::now().timestamp());
            
            let updated_model = Entity::update(active_model).exec(self.db.as_ref()).await?;
            Ok(Some(updated_model.into()))
        } else {
            Ok(None)
        }
    }

    /// 删除节点（级联删除子节点）
    pub async fn delete_node(&self, id: i32) -> Result<bool> {
        // 递归删除所有子节点
        let children = self.get_children(Some(id)).await?;
        for child in children {
            Box::pin(self.delete_node(child.id)).await?;
        }
        
        // 删除当前节点
        let result = Entity::delete_by_id(id).exec(self.db.as_ref()).await?;
        Ok(result.rows_affected > 0)
    }

    /// 处理跨父节点移动
    async fn handle_cross_parent_move(
        &self,
        txn: &DatabaseTransaction,
        node_id: i32,
        original_parent_id: Option<i32>,
        original_sort_order: i32,
        target_parent_id: Option<i32>,
        new_sort_order: Option<i32>,
    ) -> Result<()> {
        // 1. 在原父节点中移除该节点，调整后续节点的排序
        self.adjust_sort_order_after_removal(txn, original_parent_id, original_sort_order).await?;
        
        // 2. 确定在目标父节点中的排序位置
        let target_sort_order = if let Some(order) = new_sort_order {
            // 在目标父节点中为新节点腾出位置
            self.adjust_sort_order_for_insertion(txn, target_parent_id, order).await?;
            order
        } else {
            // 如果没有指定排序，则放到目标父节点的最后
            self.get_max_sort_order_in_txn(txn, target_parent_id).await? + 1
        };
        
        // 3. 更新节点的父节点和排序
        let active_model = ActiveModel {
            id: Set(node_id),
            parent_id: Set(target_parent_id),
            sort_order: Set(target_sort_order),
            updated_at: Set(chrono::Utc::now().timestamp()),
            ..Default::default()
        };
        
        Entity::update(active_model).exec(txn).await?;
        Ok(())
    }
    
    /// 处理同父节点内移动
    async fn handle_same_parent_move(
        &self,
        txn: &DatabaseTransaction,
        node_id: i32,
        parent_id: Option<i32>,
        original_sort_order: i32,
        new_sort_order: i32,
    ) -> Result<()> {
        if original_sort_order == new_sort_order {
            return Ok(());
        }
        
        if original_sort_order < new_sort_order {
            // 向后移动：将原位置到新位置之间的节点向前移动
            self.shift_nodes_forward(txn, parent_id, original_sort_order + 1, new_sort_order).await?;
        } else {
            // 向前移动：将新位置到原位置之间的节点向后移动
            self.shift_nodes_backward(txn, parent_id, new_sort_order, original_sort_order - 1).await?;
        }
        
        // 更新目标节点的排序
        let active_model = ActiveModel {
            id: Set(node_id),
            sort_order: Set(new_sort_order),
            updated_at: Set(chrono::Utc::now().timestamp()),
            ..Default::default()
        };
        
        Entity::update(active_model).exec(txn).await?;
        Ok(())
    }
    
    /// 在移除节点后调整排序
    async fn adjust_sort_order_after_removal(
        &self,
        txn: &DatabaseTransaction,
        parent_id: Option<i32>,
        removed_sort_order: i32,
    ) -> Result<()> {
        let mut query = Entity::update_many();
        
        if let Some(pid) = parent_id {
            query = query.filter(api_debug_tree::Column::ParentId.eq(pid));
        } else {
            query = query.filter(api_debug_tree::Column::ParentId.is_null());
        }
        
        query
            .filter(api_debug_tree::Column::SortOrder.gt(removed_sort_order))
            .col_expr(api_debug_tree::Column::SortOrder, Expr::col(api_debug_tree::Column::SortOrder).sub(1))
            .col_expr(api_debug_tree::Column::UpdatedAt, Expr::value(chrono::Utc::now().timestamp()))
            .exec(txn)
            .await?;
        
        Ok(())
    }
    
    /// 为插入节点调整排序
    async fn adjust_sort_order_for_insertion(
        &self,
        txn: &DatabaseTransaction,
        parent_id: Option<i32>,
        insert_position: i32,
    ) -> Result<()> {
        let mut query = Entity::update_many();
        
        if let Some(pid) = parent_id {
            query = query.filter(api_debug_tree::Column::ParentId.eq(pid));
        } else {
            query = query.filter(api_debug_tree::Column::ParentId.is_null());
        }
        
        query
            .filter(api_debug_tree::Column::SortOrder.gte(insert_position))
            .col_expr(api_debug_tree::Column::SortOrder, Expr::col(api_debug_tree::Column::SortOrder).add(1))
            .col_expr(api_debug_tree::Column::UpdatedAt, Expr::value(chrono::Utc::now().timestamp()))
            .exec(txn)
            .await?;
        
        Ok(())
    }
    
    /// 将节点向前移动（排序值减1）
    async fn shift_nodes_forward(
        &self,
        txn: &DatabaseTransaction,
        parent_id: Option<i32>,
        start_order: i32,
        end_order: i32,
    ) -> Result<()> {
        let mut query = Entity::update_many();
        
        if let Some(pid) = parent_id {
            query = query.filter(api_debug_tree::Column::ParentId.eq(pid));
        } else {
            query = query.filter(api_debug_tree::Column::ParentId.is_null());
        }
        
        query
            .filter(api_debug_tree::Column::SortOrder.between(start_order, end_order))
            .col_expr(api_debug_tree::Column::SortOrder, Expr::col(api_debug_tree::Column::SortOrder).sub(1))
            .col_expr(api_debug_tree::Column::UpdatedAt, Expr::value(chrono::Utc::now().timestamp()))
            .exec(txn)
            .await?;
        
        Ok(())
    }
    
    /// 将节点向后移动（排序值加1）
    async fn shift_nodes_backward(
        &self,
        txn: &DatabaseTransaction,
        parent_id: Option<i32>,
        start_order: i32,
        end_order: i32,
    ) -> Result<()> {
        let mut query = Entity::update_many();
        
        if let Some(pid) = parent_id {
            query = query.filter(api_debug_tree::Column::ParentId.eq(pid));
        } else {
            query = query.filter(api_debug_tree::Column::ParentId.is_null());
        }
        
        query
            .filter(api_debug_tree::Column::SortOrder.between(start_order, end_order))
            .col_expr(api_debug_tree::Column::SortOrder, Expr::col(api_debug_tree::Column::SortOrder).add(1))
            .col_expr(api_debug_tree::Column::UpdatedAt, Expr::value(chrono::Utc::now().timestamp()))
            .exec(txn)
            .await?;
        
        Ok(())
    }
    
    /// 在事务中获取指定父节点下的最大排序值
    async fn get_max_sort_order_in_txn(
        &self,
        txn: &DatabaseTransaction,
        parent_id: Option<i32>,
    ) -> Result<i32> {
        let mut query = Entity::find();
        
        if let Some(pid) = parent_id {
            query = query.filter(api_debug_tree::Column::ParentId.eq(pid));
        } else {
            query = query.filter(api_debug_tree::Column::ParentId.is_null());
        }
        
        let max_order = query
            .select_only()
            .column_as(api_debug_tree::Column::SortOrder.max(), "max_order")
            .into_tuple::<Option<i32>>()
            .one(txn)
            .await?
            .flatten()
            .unwrap_or(0);
            
        Ok(max_order)
    }
    
    /// 调整同级节点排序
    pub async fn reorder_nodes(&self, parent_id: Option<i32>, node_orders: Vec<(i32, i32)>) -> Result<()> {
        let txn = self.db.begin().await?;
        
        for (node_id, new_order) in node_orders {
            let model = Entity::find_by_id(node_id).one(&txn).await?;
            
            if let Some(model) = model {
                // 验证节点确实属于指定的父节点
                if model.parent_id == parent_id {
                    let mut active_model: ActiveModel = model.into();
                    active_model.sort_order = Set(new_order);
                    active_model.updated_at = Set(chrono::Utc::now().timestamp());
                    
                    Entity::update(active_model).exec(&txn).await?;
                }
            }
        }
        
        txn.commit().await?;
        Ok(())
    }

    /// 获取节点路径（从根到当前节点）
    pub async fn get_node_path(&self, id: i32) -> Result<Vec<TreeNodeResponse>> {
        let mut path = Vec::new();
        let mut current_id = Some(id);
        
        while let Some(id) = current_id {
            let model = Entity::find_by_id(id).one(self.db.as_ref()).await?;
            
            if let Some(model) = model {
                current_id = model.parent_id;
                path.insert(0, model.into());
            } else {
                break;
            }
        }
        
        Ok(path)
    }

    /// 搜索节点
    pub async fn search_nodes(&self, keyword: &str) -> Result<Vec<TreeNodeResponse>> {
        let models = Entity::find()
            .filter(api_debug_tree::Column::Name.contains(keyword))
            .order_by_asc(api_debug_tree::Column::Name)
            .all(self.db.as_ref())
            .await?;

        Ok(models.into_iter().map(|m| m.into()).collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sea_orm::{Database, DatabaseConnection};
    use crate::migration::{Migrator, MigratorTrait};
    use crate::dao::api_debug_dao::{ApiDebugDao, CreateApiDebugRequest};
    use crate::entities::api_debug::HttpMethod;

    async fn setup_test_db() -> DatabaseConnection {
        let db = Database::connect("sqlite::memory:").await.unwrap();
        Migrator::up(&db, None).await.unwrap();

        db
    }

    #[tokio::test]
    async fn test_create_folder() {
        let db = Arc::new(setup_test_db().await);
        let dao = ApiDebugTreeDao::new(db);

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
        let db = Arc::new(setup_test_db().await);
        let dao = ApiDebugTreeDao::new(db);

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

    #[tokio::test]
    async fn test_move_node_cross_parent() {
        let db = Arc::new(setup_test_db().await);
        let dao = ApiDebugTreeDao::new(db);

        // 创建两个文件夹
        let folder1 = dao.create_folder(CreateFolderRequest {
            name: "文件夹1".to_string(),
            parent_id: None,
        }).await.unwrap();

        let folder2 = dao.create_folder(CreateFolderRequest {
            name: "文件夹2".to_string(),
            parent_id: None,
        }).await.unwrap();

        // 在文件夹1中创建多个请求
        let _request1 = dao.create_request_node(CreateRequestNodeRequest {
            name: "请求1".to_string(),
            parent_id: Some(folder1.id),
            api_debug_id: 456,
        }).await.unwrap();
        
        let request2 = dao.create_request_node(CreateRequestNodeRequest {
            name: "请求2".to_string(),
            parent_id: Some(folder1.id),
            api_debug_id: 457,
        }).await.unwrap();
        
        let _request3 = dao.create_request_node(CreateRequestNodeRequest {
            name: "请求3".to_string(),
            parent_id: Some(folder1.id),
            api_debug_id: 458,
        }).await.unwrap();

        // 将请求2移动到文件夹2
        let move_req = MoveNodeRequest {
            target_parent_id: Some(folder2.id),
            new_sort_order: Some(1),
        };

        let moved_node = dao.move_node(request2.id, move_req).await.unwrap().unwrap();
        assert_eq!(moved_node.parent_id, Some(folder2.id));
        assert_eq!(moved_node.sort_order, 1);
        
        // 验证原文件夹中剩余节点的排序
        let folder1_children = dao.get_children(Some(folder1.id)).await.unwrap();
        assert_eq!(folder1_children.len(), 2);
        assert_eq!(folder1_children[0].name, "请求1");
        assert_eq!(folder1_children[0].sort_order, 1);
        assert_eq!(folder1_children[1].name, "请求3");
        assert_eq!(folder1_children[1].sort_order, 2);
        
        // 验证目标文件夹中的节点
        let folder2_children = dao.get_children(Some(folder2.id)).await.unwrap();
        assert_eq!(folder2_children.len(), 1);
        assert_eq!(folder2_children[0].name, "请求2");
        assert_eq!(folder2_children[0].sort_order, 1);
    }
    
    #[tokio::test]
    async fn test_move_node_same_parent() {
        let db = Arc::new(setup_test_db().await);
        let dao = ApiDebugTreeDao::new(db);

        // 创建一个文件夹
        let folder = dao.create_folder(CreateFolderRequest {
            name: "测试文件夹".to_string(),
            parent_id: None,
        }).await.unwrap();

        // 在文件夹中创建多个请求
        let _request1 = dao.create_request_node(CreateRequestNodeRequest {
            name: "请求1".to_string(),
            parent_id: Some(folder.id),
            api_debug_id: 456,
        }).await.unwrap();
        
        let request2 = dao.create_request_node(CreateRequestNodeRequest {
            name: "请求2".to_string(),
            parent_id: Some(folder.id),
            api_debug_id: 457,
        }).await.unwrap();
        
        let _request3 = dao.create_request_node(CreateRequestNodeRequest {
            name: "请求3".to_string(),
            parent_id: Some(folder.id),
            api_debug_id: 458,
        }).await.unwrap();
        
        let request4 = dao.create_request_node(CreateRequestNodeRequest {
            name: "请求4".to_string(),
            parent_id: Some(folder.id),
            api_debug_id: 459,
        }).await.unwrap();

        // 将请求2从位置2移动到位置4（向后移动）
        let move_req = MoveNodeRequest {
            target_parent_id: Some(folder.id),
            new_sort_order: Some(4),
        };

        dao.move_node(request2.id, move_req).await.unwrap();
        
        // 验证移动后的排序
        let children = dao.get_children(Some(folder.id)).await.unwrap();
        assert_eq!(children.len(), 4);
        assert_eq!(children[0].name, "请求1");
        assert_eq!(children[0].sort_order, 1);
        assert_eq!(children[1].name, "请求3");
        assert_eq!(children[1].sort_order, 2);
        assert_eq!(children[2].name, "请求4");
        assert_eq!(children[2].sort_order, 3);
        assert_eq!(children[3].name, "请求2");
        assert_eq!(children[3].sort_order, 4);
        
        // 将请求4从位置3移动到位置1（向前移动）
        let move_req2 = MoveNodeRequest {
            target_parent_id: Some(folder.id),
            new_sort_order: Some(1),
        };

        dao.move_node(request4.id, move_req2).await.unwrap();
        
        // 验证移动后的排序
        let children2 = dao.get_children(Some(folder.id)).await.unwrap();
        assert_eq!(children2.len(), 4);
        assert_eq!(children2[0].name, "请求4");
        assert_eq!(children2[0].sort_order, 1);
        assert_eq!(children2[1].name, "请求1");
        assert_eq!(children2[1].sort_order, 2);
        assert_eq!(children2[2].name, "请求3");
        assert_eq!(children2[2].sort_order, 3);
        assert_eq!(children2[3].name, "请求2");
        assert_eq!(children2[3].sort_order, 4);
    }

    #[tokio::test]
    async fn test_cycle_detection() {
        let db = Arc::new(setup_test_db().await);
        let dao = ApiDebugTreeDao::new(db);

        // 创建父子文件夹
        let parent = dao.create_folder(CreateFolderRequest {
            name: "父文件夹".to_string(),
            parent_id: None,
        }).await.unwrap();

        let child = dao.create_folder(CreateFolderRequest {
            name: "子文件夹".to_string(),
            parent_id: Some(parent.id),
        }).await.unwrap();

        // 尝试将父文件夹移动到子文件夹下（应该失败）
        let move_req = MoveNodeRequest {
            target_parent_id: Some(child.id),
            new_sort_order: None,
        };

        let result = dao.move_node(parent.id, move_req).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("循环引用"));
    }

    #[tokio::test]
    async fn test_rename_node() {
        let db = Arc::new(setup_test_db().await);
        let dao = ApiDebugTreeDao::new(db);

        let folder = dao.create_folder(CreateFolderRequest {
            name: "原始名称".to_string(),
            parent_id: None,
        }).await.unwrap();

        let rename_req = RenameNodeRequest {
            name: "新名称".to_string(),
        };

        let renamed_node = dao.rename_node(folder.id, rename_req).await.unwrap().unwrap();
        assert_eq!(renamed_node.name, "新名称");
    }

    #[tokio::test]
    async fn test_delete_node() {
        let db = Arc::new(setup_test_db().await);
        let dao = ApiDebugTreeDao::new(db);

        // 创建父文件夹和子节点
        let parent = dao.create_folder(CreateFolderRequest {
            name: "父文件夹".to_string(),
            parent_id: None,
        }).await.unwrap();

        let child = dao.create_folder(CreateFolderRequest {
            name: "子文件夹".to_string(),
            parent_id: Some(parent.id),
        }).await.unwrap();

        // 删除父文件夹（应该级联删除子文件夹）
        let deleted = dao.delete_node(parent.id).await.unwrap();
        assert!(deleted);

        // 验证子节点也被删除
        let child_node = dao.get_node(child.id).await.unwrap();
        assert!(child_node.is_none());
    }

    #[tokio::test]
    async fn test_reorder_nodes() {
        let db = Arc::new(setup_test_db().await);
        let dao = ApiDebugTreeDao::new(db);

        // 创建父文件夹
        let parent = dao.create_folder(CreateFolderRequest {
            name: "父文件夹".to_string(),
            parent_id: None,
        }).await.unwrap();

        // 创建多个子节点
        let child1 = dao.create_folder(CreateFolderRequest {
            name: "子节点1".to_string(),
            parent_id: Some(parent.id),
        }).await.unwrap();

        let child2 = dao.create_folder(CreateFolderRequest {
            name: "子节点2".to_string(),
            parent_id: Some(parent.id),
        }).await.unwrap();

        let child3 = dao.create_folder(CreateFolderRequest {
            name: "子节点3".to_string(),
            parent_id: Some(parent.id),
        }).await.unwrap();

        // 重新排序：将顺序改为 3, 1, 2
        let reorder_data = vec![
            (child3.id, 1),
            (child1.id, 2),
            (child2.id, 3),
        ];

        dao.reorder_nodes(Some(parent.id), reorder_data).await.unwrap();

        // 验证新的排序
        let children = dao.get_children(Some(parent.id)).await.unwrap();
        assert_eq!(children.len(), 3);
        assert_eq!(children[0].name, "子节点3");
        assert_eq!(children[1].name, "子节点1");
        assert_eq!(children[2].name, "子节点2");
    }

    #[tokio::test]
    async fn test_get_node_path() {
        let db = Arc::new(setup_test_db().await);
        let dao = ApiDebugTreeDao::new(db);

        // 创建多层嵌套结构
        let level1 = dao.create_folder(CreateFolderRequest {
            name: "级别1".to_string(),
            parent_id: None,
        }).await.unwrap();

        let level2 = dao.create_folder(CreateFolderRequest {
            name: "级别2".to_string(),
            parent_id: Some(level1.id),
        }).await.unwrap();

        let level3 = dao.create_folder(CreateFolderRequest {
            name: "级别3".to_string(),
            parent_id: Some(level2.id),
        }).await.unwrap();

        // 获取最深层节点的路径
        let path = dao.get_node_path(level3.id).await.unwrap();
        assert_eq!(path.len(), 3);
        assert_eq!(path[0].name, "级别1");
        assert_eq!(path[1].name, "级别2");
        assert_eq!(path[2].name, "级别3");
    }

    #[tokio::test]
    async fn test_search_nodes() {
        let db = Arc::new(setup_test_db().await);
        let dao = ApiDebugTreeDao::new(db);

        // 创建一些测试节点
        dao.create_folder(CreateFolderRequest {
            name: "用户管理".to_string(),
            parent_id: None,
        }).await.unwrap();

        dao.create_folder(CreateFolderRequest {
            name: "用户权限".to_string(),
            parent_id: None,
        }).await.unwrap();

        dao.create_folder(CreateFolderRequest {
            name: "订单管理".to_string(),
            parent_id: None,
        }).await.unwrap();

        // 搜索包含"用户"的节点
        let results = dao.search_nodes("用户").await.unwrap();
        assert_eq!(results.len(), 2);
        assert!(results.iter().any(|n| n.name == "用户管理"));
        assert!(results.iter().any(|n| n.name == "用户权限"));
    }

    #[tokio::test]
    async fn test_sort_order_auto_increment() {
        let db = Arc::new(setup_test_db().await);
        let dao = ApiDebugTreeDao::new(db);

        // 在同一父节点下创建多个子节点
        let parent = dao.create_folder(CreateFolderRequest {
            name: "父文件夹".to_string(),
            parent_id: None,
        }).await.unwrap();

        let child1 = dao.create_folder(CreateFolderRequest {
            name: "子节点1".to_string(),
            parent_id: Some(parent.id),
        }).await.unwrap();

        let child2 = dao.create_folder(CreateFolderRequest {
            name: "子节点2".to_string(),
            parent_id: Some(parent.id),
        }).await.unwrap();

        let child3 = dao.create_folder(CreateFolderRequest {
            name: "子节点3".to_string(),
            parent_id: Some(parent.id),
        }).await.unwrap();

        // 验证排序顺序自动递增
        assert_eq!(child1.sort_order, 1);
        assert_eq!(child2.sort_order, 2);
        assert_eq!(child3.sort_order, 3);
    }

    #[tokio::test]
    async fn test_create_real_api_debug_with_tree() {
        let db = Arc::new(setup_test_db().await);
        let tree_dao = ApiDebugTreeDao::new(db.clone());
        let api_debug_dao = ApiDebugDao::new(db);

        // 创建一个API接口分类文件夹
        let api_folder = tree_dao.create_folder(CreateFolderRequest {
            name: "用户管理API".to_string(),
            parent_id: None,
        }).await.unwrap();

        // 创建子文件夹
        let auth_folder = tree_dao.create_folder(CreateFolderRequest {
            name: "认证相关".to_string(),
            parent_id: Some(api_folder.id),
        }).await.unwrap();

        let user_folder = tree_dao.create_folder(CreateFolderRequest {
            name: "用户操作".to_string(),
            parent_id: Some(api_folder.id),
        }).await.unwrap();

        // 创建真实的API debug记录
        let login_api = api_debug_dao.create(CreateApiDebugRequest {
            name: "用户登录".to_string(),
            method: HttpMethod::Post,
            url: "https://api.example.com/auth/login".to_string(),
            headers: Some(serde_json::json!({
                "Content-Type": "application/json",
                "Accept": "application/json"
            })),
            body: Some(r#"{"username": "test@example.com", "password": "password123"}"#.to_string()),
            content_type: Some("application/json".to_string()),
            timeout: Some(30),
            is_history: false,
        }).await.unwrap();

        let register_api = api_debug_dao.create(CreateApiDebugRequest {
            name: "用户注册".to_string(),
            method: HttpMethod::Post,
            url: "https://api.example.com/auth/register".to_string(),
            headers: Some(serde_json::json!({
                "Content-Type": "application/json"
            })),
            body: Some(r#"{"username": "newuser@example.com", "password": "newpass123", "email": "newuser@example.com"}"#.to_string()),
            content_type: Some("application/json".to_string()),
            timeout: Some(30),
            is_history: false,
        }).await.unwrap();

        let get_profile_api = api_debug_dao.create(CreateApiDebugRequest {
            name: "获取用户信息".to_string(),
            method: HttpMethod::Get,
            url: "https://api.example.com/user/profile".to_string(),
            headers: Some(serde_json::json!({
                "Authorization": "Bearer token123",
                "Accept": "application/json"
            })),
            body: None,
            content_type: None,
            timeout: Some(15),
            is_history: false,
        }).await.unwrap();

        let update_profile_api = api_debug_dao.create(CreateApiDebugRequest {
            name: "更新用户信息".to_string(),
            method: HttpMethod::Put,
            url: "https://api.example.com/user/profile".to_string(),
            headers: Some(serde_json::json!({
                "Authorization": "Bearer token123",
                "Content-Type": "application/json"
            })),
            body: Some(r#"{"nickname": "新昵称", "avatar": "https://example.com/avatar.jpg"}"#.to_string()),
            content_type: Some("application/json".to_string()),
            timeout: Some(30),
            is_history: false,
        }).await.unwrap();

        // 将API debug记录关联到树节点
        let login_node = tree_dao.create_request_node(CreateRequestNodeRequest {
            name: login_api.name.clone(),
            parent_id: Some(auth_folder.id),
            api_debug_id: login_api.id,
        }).await.unwrap();

        let register_node = tree_dao.create_request_node(CreateRequestNodeRequest {
            name: register_api.name.clone(),
            parent_id: Some(auth_folder.id),
            api_debug_id: register_api.id,
        }).await.unwrap();

        let get_profile_node = tree_dao.create_request_node(CreateRequestNodeRequest {
            name: get_profile_api.name.clone(),
            parent_id: Some(user_folder.id),
            api_debug_id: get_profile_api.id,
        }).await.unwrap();

        let update_profile_node = tree_dao.create_request_node(CreateRequestNodeRequest {
            name: update_profile_api.name.clone(),
            parent_id: Some(user_folder.id),
            api_debug_id: update_profile_api.id,
        }).await.unwrap();

        // 验证树结构
        let tree = tree_dao.get_tree().await.unwrap();
        assert_eq!(tree.nodes.len(), 1); // 只有一个根节点
        
        let root_node = &tree.nodes[0];
        assert_eq!(root_node.name, "用户管理API");
        assert_eq!(root_node.node_type, NodeType::Folder);
        
        let children = root_node.children.as_ref().unwrap();
        assert_eq!(children.len(), 2); // 两个子文件夹
        
        // 验证认证文件夹
        let auth_node = children.iter().find(|n| n.name == "认证相关").unwrap();
        let auth_children = auth_node.children.as_ref().unwrap();
        assert_eq!(auth_children.len(), 2); // 两个API请求
        
        // 验证用户操作文件夹
        let user_node = children.iter().find(|n| n.name == "用户操作").unwrap();
        let user_children = user_node.children.as_ref().unwrap();
        assert_eq!(user_children.len(), 2); // 两个API请求
        
        // 验证API debug记录关联
        assert_eq!(login_node.api_debug_id, Some(login_api.id));
        assert_eq!(register_node.api_debug_id, Some(register_api.id));
        assert_eq!(get_profile_node.api_debug_id, Some(get_profile_api.id));
        assert_eq!(update_profile_node.api_debug_id, Some(update_profile_api.id));
        
        // 验证API debug记录的内容
        assert_eq!(login_api.method, HttpMethod::Post);
        assert_eq!(login_api.url, "https://api.example.com/auth/login");
        assert!(login_api.body.is_some());
        
        assert_eq!(get_profile_api.method, HttpMethod::Get);
        assert_eq!(get_profile_api.url, "https://api.example.com/user/profile");
        assert!(get_profile_api.body.is_none());
    }
}