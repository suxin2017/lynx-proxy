use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// Capture type enumeration
#[derive(
    Debug, Clone, PartialEq, Eq, Serialize, Deserialize, ToSchema,
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
