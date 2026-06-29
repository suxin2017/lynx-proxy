use serde::{Deserialize, Serialize};

/// Capture type enumeration
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[derive(Default)]
pub enum CaptureType {
    #[default]
    Glob,
    Regex,
    Exact,
    Contains,
}
