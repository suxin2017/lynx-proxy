use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// HTML script injection handler configuration
#[derive(Debug, Serialize, Deserialize, ToSchema, Default, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HtmlScriptInjectorConfig {
    /// Content to inject into HTML pages
    pub content: Option<String>,
    /// Position to inject the content (head, body-start, body-end)
    pub injection_position: Option<String>,
}

impl HtmlScriptInjectorConfig {
    pub fn new() -> Self {
        Self {
            content: None,
            injection_position: Some("body-end".to_string()),
        }
    }

    pub fn with_content(mut self, content: String) -> Self {
        self.content = Some(content);
        self
    }

    pub fn with_injection_position(mut self, position: String) -> Self {
        self.injection_position = Some(position);
        self
    }
}
