//! Handler Entity for request processing actions

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use utoipa::ToSchema;

/// Handler type enumeration
#[derive(
    Debug, Clone, PartialEq, Eq, DeriveActiveEnum, EnumIter, Serialize, Deserialize, ToSchema,
)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::N(30))")]
#[serde(rename_all = "camelCase")]
pub enum HandlerType {
    #[sea_orm(string_value = "block")]
    Block,
    #[sea_orm(string_value = "modify_request")]
    ModifyRequest,
    #[sea_orm(string_value = "local_file")]
    LocalFile,
    #[sea_orm(string_value = "modify_response")]
    ModifyResponse,
    #[sea_orm(string_value = "proxy_forward")]
    ProxyForward,
}

impl Default for HandlerType {
    fn default() -> Self {
        Self::Block
    }
}

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
#[sea_orm(table_name = "handler")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub rule_id: i32,
    pub handler_type: HandlerType,
    #[sea_orm(column_type = "Text")]
    pub name: String,
    pub description: Option<String>,
    #[sea_orm(default_value = 0)]
    pub execution_order: i32,
    #[sea_orm(column_type = "Json")]
    pub config: JsonValue,
    #[sea_orm(default_value = true)]
    pub enabled: bool,
    #[serde(skip)]
    pub created_at: ChronoDateTimeUtc,
    #[serde(skip)]
    pub updated_at: ChronoDateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::rule::Entity",
        from = "Column::RuleId",
        to = "super::rule::Column::Id"
    )]
    Rule,
}

impl Related<super::rule::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Rule.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
