
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, ToSchema, Default, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProxyForwardConfig {
    pub target_scheme: Option<String>,
    pub target_authority: Option<String>,
    pub target_path: Option<String>,
}
