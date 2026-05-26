use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// Tree node type
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub enum NodeType {
    Folder,
    Request,
}

impl Default for NodeType {
    fn default() -> Self {
        Self::Folder
    }
}
