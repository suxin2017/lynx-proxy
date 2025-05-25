use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// Block handler configuration
#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BlockHandlerConfig {
    pub status_code: Option<u16>,
    pub reason: Option<String>,
}
