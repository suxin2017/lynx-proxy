use serde::{Deserialize, Serialize};

/// Capture type enumeration
#[derive(
    Debug, Clone, PartialEq, Eq, Serialize, Deserialize,
)]
#[serde(rename_all = "camelCase")]
pub enum CaptureType {
    Glob,
    Regex,
    Exact,
    Contains,
}

impl Default for CaptureType {
    fn default() -> Self {
        Self::Glob
    }
}
