use serde::{Deserialize, Deserializer, Serialize};

fn normalize_optional_string(value: Option<String>) -> Option<String> {
    value.and_then(|s| {
        let trimmed = s.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    })
}

fn deserialize_optional_non_empty_string<'de, D>(
    deserializer: D,
) -> Result<Option<String>, D::Error>
where
    D: Deserializer<'de>,
{
    let value = Option::<String>::deserialize(deserializer)?;
    Ok(value.and_then(|s| {
        let trimmed = s.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    }))
}

#[derive(Debug, Serialize, Deserialize, Default, Clone, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ProxyForwardConfig {
    #[serde(default, deserialize_with = "deserialize_optional_non_empty_string")]
    pub target_scheme: Option<String>,
    #[serde(default, deserialize_with = "deserialize_optional_non_empty_string")]
    pub target_authority: Option<String>,
    #[serde(default, deserialize_with = "deserialize_optional_non_empty_string")]
    pub target_path: Option<String>,
}

impl ProxyForwardConfig {
    pub fn new(
        target_scheme: Option<String>,
        target_authority: Option<String>,
        target_path: Option<String>,
    ) -> Self {
        Self {
            target_scheme: normalize_optional_string(target_scheme),
            target_authority: normalize_optional_string(target_authority),
            target_path: normalize_optional_string(target_path),
        }
    }

    pub fn optional_field(value: &Option<String>) -> Option<&str> {
        value.as_deref().map(str::trim).filter(|s| !s.is_empty())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deserializes_empty_proxy_forward_fields_as_none() {
        let config: ProxyForwardConfig = serde_json::from_value(serde_json::json!({
            "targetScheme": "",
            "targetAuthority": "127.0.0.1:8000",
            "targetPath": "  "
        }))
        .expect("deserialize proxy forward config");

        assert!(config.target_scheme.is_none());
        assert_eq!(
            config.target_authority.as_deref(),
            Some("127.0.0.1:8000")
        );
        assert!(config.target_path.is_none());
    }

    #[test]
    fn new_normalizes_empty_proxy_forward_fields() {
        let config = ProxyForwardConfig::new(
            Some("".to_string()),
            Some("127.0.0.1:8000".to_string()),
            Some("   ".to_string()),
        );

        assert!(config.target_scheme.is_none());
        assert_eq!(
            config.target_authority.as_deref(),
            Some("127.0.0.1:8000")
        );
        assert!(config.target_path.is_none());
    }
}
