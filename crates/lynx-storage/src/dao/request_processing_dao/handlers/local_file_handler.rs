use serde::{Deserialize, Serialize};

/// Local file handler configuration
#[derive(Debug, Serialize, Deserialize, Default, Clone, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct LocalFileConfig {
    pub file_path: String,
    pub content_type: Option<String>,
    pub status_code: Option<u16>,
}
