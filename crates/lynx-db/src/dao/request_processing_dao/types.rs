use crate::entities::{capture::CaptureType, handler::HandlerType};
use serde::{Deserialize, Serialize};
use serde_json::{Value as JsonValue, json};
use utoipa::ToSchema;

/// Request processing rule with capture and handlers
#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RequestRule {
    pub id: Option<i32>,
    pub name: String,
    pub description: Option<String>,
    pub enabled: bool,
    pub priority: i32,
    pub capture: CaptureRule,
    pub handlers: Vec<HandlerRule>,
}

/// Capture rule configuration
#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CaptureRule {
    pub id: Option<i32>,
    pub capture_type: CaptureType,
    pub pattern: String,
    pub method: Option<String>,
    pub host: Option<String>,
    pub config: JsonValue,
    pub enabled: bool,
}

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

/// Block handler configuration
#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BlockHandlerConfig {
    pub status_code: Option<u16>,
    pub reason: Option<String>,
}

/// Modify request handler configuration
#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ModifyRequestConfig {
    pub modify_headers: Option<std::collections::HashMap<String, String>>,
    pub modify_body: Option<String>,
    pub modify_method: Option<String>,
    pub modify_url: Option<String>,
}

/// Local file handler configuration
#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LocalFileConfig {
    pub file_path: String,
    pub content_type: Option<String>,
    pub status_code: Option<u16>,
}

impl Default for RequestRule {
    fn default() -> Self {
        Self {
            id: None,
            name: "New Rule".to_string(),
            description: None,
            enabled: true,
            priority: 0,
            capture: CaptureRule::default(),
            handlers: vec![],
        }
    }
}

impl Default for CaptureRule {
    fn default() -> Self {
        Self {
            id: None,
            capture_type: CaptureType::Glob,
            pattern: "*".to_string(),
            method: None,
            host: None,
            config: json!({}),
            enabled: true,
        }
    }
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
