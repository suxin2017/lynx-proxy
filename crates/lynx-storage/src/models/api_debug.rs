use serde::{Deserialize, Serialize};

/// HTTP method enumeration
#[derive(
    Debug, Clone, PartialEq, Eq, Serialize, Deserialize,
)]
#[serde(rename_all = "UPPERCASE")]
pub enum HttpMethod {
    Get,
    Post,
    Put,
    Delete,
    Patch,
    Head,
    Options,
}

impl Default for HttpMethod {
    fn default() -> Self {
        Self::Get
    }
}

/// Request status enumeration
#[derive(
    Debug, Clone, PartialEq, Eq, Serialize, Deserialize,
)]
#[serde(rename_all = "camelCase")]
pub enum RequestStatus {
    Pending,
    Success,
    Failed,
    Timeout,
}

impl Default for RequestStatus {
    fn default() -> Self {
        Self::Pending
    }
}
