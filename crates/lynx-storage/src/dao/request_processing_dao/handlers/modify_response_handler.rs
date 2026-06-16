use serde::{Deserialize, Serialize};

/// Modify request handler configuration
#[derive(Debug, Serialize, Deserialize, Default, Clone, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ModifyResponseConfig {
    pub modify_headers: Option<std::collections::HashMap<String, String>>,
    pub modify_body: Option<String>,
    pub modify_method: Option<String>,
    pub modify_status_code: Option<u16>,
}
