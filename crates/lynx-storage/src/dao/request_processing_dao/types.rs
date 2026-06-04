use serde::{Deserialize, Serialize};

use super::handlers::HandlerRule;

/// 完整的捕获规则
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CaptureRule {
    pub id: Option<i32>,
    pub match_expr: String,
}

/// 请求处理规则
#[derive(Debug, Serialize, Deserialize, Clone)]
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

/// Modify request handler configuration
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ModifyRequestConfig {
    pub modify_headers: Option<std::collections::HashMap<String, String>>,
    pub modify_body: Option<String>,
    pub modify_method: Option<String>,
    pub modify_url: Option<String>,
}

/// Local file handler configuration
#[derive(Debug, Serialize, Deserialize, Clone)]
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
            // A non-empty DSL expression. `/` matches any path; users can add host/method/etc.
            match_expr: "/".to_string(),
        }
    }
}
