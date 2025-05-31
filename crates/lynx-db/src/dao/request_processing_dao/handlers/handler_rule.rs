use crate::entities::handler::{self, HandlerType};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::{
    BlockHandlerConfig, LocalFileConfig, ModifyRequestConfig,
    modify_response_handler::ModifyResponseConfig, proxy_forward_handler::ProxyForwardConfig,
};

#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
#[serde(rename_all = "camelCase", tag = "type")]
pub enum HandlerRuleType {
    Block(BlockHandlerConfig),
    ModifyRequest(ModifyRequestConfig),
    LocalFile(LocalFileConfig),
    ModifyResponse(ModifyResponseConfig),
    ProxyForward(ProxyForwardConfig),
}

impl From<&handler::Model> for HandlerRuleType {
    fn from(model: &handler::Model) -> Self {
        match model.handler_type {
            HandlerType::Block => {
                let config: BlockHandlerConfig =
                    serde_json::from_value(model.config.clone()).unwrap_or_default();
                HandlerRuleType::Block(config)
            }
            HandlerType::ModifyRequest => {
                let config: ModifyRequestConfig =
                    serde_json::from_value(model.config.clone()).unwrap_or_default();
                HandlerRuleType::ModifyRequest(config)
            }
            HandlerType::LocalFile => {
                let config: LocalFileConfig =
                    serde_json::from_value(model.config.clone()).unwrap_or_default();
                HandlerRuleType::LocalFile(config)
            }
            HandlerType::ModifyResponse => {
                let config: ModifyResponseConfig =
                    serde_json::from_value(model.config.clone()).unwrap_or_default();
                HandlerRuleType::ModifyResponse(config)
            }
            HandlerType::ProxyForward => {
                let config: ProxyForwardConfig =
                    serde_json::from_value(model.config.clone()).unwrap_or_default();
                HandlerRuleType::ProxyForward(config)
            }
        }
    }
}

/// Handler rule configuration
#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HandlerRule {
    pub id: Option<i32>,
    pub handler_type: HandlerRuleType,
    pub name: String,
    pub description: Option<String>,
    pub execution_order: i32,
    pub enabled: bool,
}

impl Default for HandlerRule {
    fn default() -> Self {
        Self {
            id: None,
            handler_type: HandlerRuleType::Block(BlockHandlerConfig {
                status_code: Some(403),
                reason: Some("block".to_string()),
            }),
            name: "Default Handler".to_string(),
            description: None,
            execution_order: 0,
            enabled: true,
        }
    }
}

impl HandlerRule {
    /// 获取默认的 Handler 模板
    pub fn default_templates() -> Vec<HandlerRule> {
        vec![
            // Block Handler 模板
            HandlerRule {
                id: None,
                handler_type: HandlerRuleType::Block(BlockHandlerConfig {
                    status_code: Some(403),
                    reason: Some("Access blocked by proxy".to_string()),
                }),
                name: "Block Access".to_string(),
                description: Some("Block all requests with 403 Forbidden".to_string()),
                execution_order: 100,
                enabled: false,
            },
        ]
    }
}
