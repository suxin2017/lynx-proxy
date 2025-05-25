//! Capture Entity for defining capture rules

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use utoipa::ToSchema;

/// Capture type enumeration
#[derive(
    Debug, Clone, PartialEq, Eq, DeriveActiveEnum, EnumIter, Serialize, Deserialize, ToSchema,
)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::N(20))")]
#[serde(rename_all = "camelCase")]
pub enum CaptureType {
    #[sea_orm(string_value = "glob")]
    Glob,
    // #[sea_orm(string_value = "regex")]
    // Regex,
    // #[sea_orm(string_value = "exact")]
    // Exact,
    // #[sea_orm(string_value = "contains")]
    // Contains,
}

impl Default for CaptureType {
    fn default() -> Self {
        Self::Glob
    }
}

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
#[sea_orm(table_name = "capture")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,

    /// Foreign key to rule
    pub rule_id: i32,

    /// Capture type
    pub capture_type: CaptureType,

    /// Capture pattern (glob, regex, etc.)
    #[sea_orm(column_type = "Text")]
    pub pattern: String,

    /// Match method (GET, POST, etc., empty means all methods)
    pub method: Option<String>,

    /// Match host (empty means all hosts)
    pub host: Option<String>,

    /// Additional capture configuration
    #[sea_orm(column_type = "Json")]
    pub config: JsonValue,

    /// Whether this capture rule is enabled
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
