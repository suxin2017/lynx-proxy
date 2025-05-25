use crate::entities::handler::HandlerType;
use serde::{Deserialize, Serialize};
use serde_json::{Value as JsonValue, json};
use utoipa::ToSchema;

/// Handler rule configuration
#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HandlerRule {
    pub id: Option<i32>,
    pub handler_type: HandlerType,
    pub name: String,
    pub description: Option<String>,
    pub execution_order: i32,
    pub config: JsonValue,
    pub enabled: bool,
}

impl Default for HandlerRule {
    fn default() -> Self {
        Self {
            id: None,
            handler_type: HandlerType::Block,
            name: "Default Handler".to_string(),
            description: None,
            execution_order: 0,
            config: json!({}),
            enabled: true,
        }
    }
}
