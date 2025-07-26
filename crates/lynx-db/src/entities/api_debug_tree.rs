use sea_orm::entity::prelude::*;
use sea_orm::sea_query::StringLen;
use sea_orm::{NotSet, Set};
use serde::{Deserialize, Serialize};

use utoipa::ToSchema;

/// 树节点类型枚举
#[derive(Debug, Clone, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize, ToSchema)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::N(20))")]
#[serde(rename_all = "camelCase")]
pub enum NodeType {
    #[sea_orm(string_value = "folder")]
    Folder,
    #[sea_orm(string_value = "request")]
    Request,
}

impl Default for NodeType {
    fn default() -> Self {
        Self::Folder
    }
}

/// API调试树节点实体
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
#[sea_orm(table_name = "api_debug_tree")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    /// 节点名称
    #[sea_orm(column_type = "String(StringLen::N(255))")]
    pub name: String,
    /// 节点类型
    pub node_type: NodeType,
    /// 父节点ID，根节点为null
    pub parent_id: Option<i32>,
    /// 关联的api_debug记录ID（仅Request类型使用）
    pub api_debug_id: Option<i32>,
    /// 同级节点排序
    pub sort_order: i32,
    /// 创建时间
    pub created_at: i64,
    /// 更新时间
    pub updated_at: i64,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    /// 自关联：父子节点关系
    #[sea_orm(
        belongs_to = "Entity",
        from = "Column::ParentId",
        to = "Column::Id"
    )]
    Parent,
}

/// 自关联实现
impl Related<Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Parent.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

impl Model {
    /// 创建新的文件夹节点
    pub fn new_folder(name: String, parent_id: Option<i32>, sort_order: i32) -> ActiveModel {
        let now = chrono::Utc::now().timestamp();
        ActiveModel {
            id: NotSet, // 由数据库自动生成
            name: Set(name),
            node_type: Set(NodeType::Folder),
            parent_id: Set(parent_id),
            api_debug_id: Set(None),
            sort_order: Set(sort_order),
            created_at: Set(now),
            updated_at: Set(now),
        }
    }

    /// 创建新的请求节点
    pub fn new_request(
        name: String,
        parent_id: Option<i32>,
        api_debug_id: i32,
        sort_order: i32,
    ) -> ActiveModel {
        let now = chrono::Utc::now().timestamp();
        ActiveModel {
            id: NotSet, // 由数据库自动生成
            name: Set(name),
            node_type: Set(NodeType::Request),
            parent_id: Set(parent_id),
            api_debug_id: Set(Some(api_debug_id)),
            sort_order: Set(sort_order),
            created_at: Set(now),
            updated_at: Set(now),
        }
    }

    /// 是否为文件夹节点
    pub fn is_folder(&self) -> bool {
        self.node_type == NodeType::Folder
    }

    /// 是否为请求节点
    pub fn is_request(&self) -> bool {
        self.node_type == NodeType::Request
    }

    /// 是否为根节点
    pub fn is_root(&self) -> bool {
        self.parent_id.is_none()
    }
}