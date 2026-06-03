use serde::{Deserialize, Deserializer, Serialize};

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

#[derive(Debug, Serialize, Deserialize, Default, Clone)]
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
    pub fn optional_field(value: &Option<String>) -> Option<&str> {
        value.as_deref().map(str::trim).filter(|s| !s.is_empty())
    }
}
