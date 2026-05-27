use serde::{Deserialize, Serialize};

/// Tree node type
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
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
