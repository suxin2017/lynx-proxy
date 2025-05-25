//! Handler Entity for defining request processing actions

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use utoipa::ToSchema;

/// Handler type enumeration for extensibility
#[derive(
    Debug, Clone, PartialEq, Eq, DeriveActiveEnum, EnumIter, Serialize, Deserialize, ToSchema,
)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::N(30))")]
#[serde(rename_all = "camelCase")]
pub enum HandlerType {
    /// Block the request
    #[sea_orm(string_value = "block")]
    Block,
    // /// Modify request body
    // #[sea_orm(string_value = "modify_request")]
    // ModifyRequest,
    // /// Replace with local file
    // #[sea_orm(string_value = "local_file")]
    // LocalFile,
    // /// Modify response body
    // #[sea_orm(string_value = "modify_response")]
    // ModifyResponse,
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

    /// Foreign key to rule
    pub rule_id: i32,

    /// Handler type
    pub handler_type: HandlerType,

    /// Handler name for identification
    #[sea_orm(column_type = "Text")]
    pub name: String,

    /// Handler description
    pub description: Option<String>,

    /// Handler execution order (lower number = earlier execution)
    #[sea_orm(default_value = 0)]
    pub execution_order: i32,

    /// Handler configuration (JSON format for flexibility)
    #[sea_orm(column_type = "Json")]
    pub config: JsonValue,

    /// Whether this handler is enabled
    #[sea_orm(default_value = true)]
    pub enabled: bool,

    /// Creation timestamp
    #[serde(skip)]
    pub created_at: ChronoDateTimeUtc,

    /// Update timestamp
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
