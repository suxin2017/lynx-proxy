use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// Block handler configuration
#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BlockHandlerConfig {
    pub status_code: Option<u16>,
    pub reason: Option<String>,
}

impl Default for BlockHandlerConfig {
    fn default() -> Self {
        Self {
            status_code: Some(403),
            reason: Some("Access blocked by proxy".to_string()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_block_handler_serialization() {
        let handler = BlockHandlerConfig {
            status_code: Some(403),
            reason: Some("Custom block message".to_string()),
        };

        let json = serde_json::to_string(&handler).unwrap();
        let deserialized: BlockHandlerConfig = serde_json::from_str(&json).unwrap();

        assert_eq!(handler.status_code, deserialized.status_code);
        assert_eq!(handler.reason, deserialized.reason);
    }
}
