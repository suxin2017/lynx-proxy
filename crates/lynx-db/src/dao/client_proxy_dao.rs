use anyhow::Result;
use sea_orm::*;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use utoipa::ToSchema;

use crate::entities::app_config::{
    self as app_config_mod, ActiveModel, Entity as AppConfigEntity, Model,
};

#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProxyConfig {
    #[serde(rename = "type")]
    #[schema(example = "none")]
    pub proxy_type: String,
    #[schema(example = "http://proxy.example.com:8080")]
    pub url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema, Default, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ClientProxyConfig {
    pub proxy_requests: ProxyConfig,
    pub api_debug: ProxyConfig,
}

impl Default for ProxyConfig {
    fn default() -> Self {
        Self {
            proxy_type: "none".to_string(),
            url: None,
        }
    }
}

impl From<ClientProxyConfig> for ActiveModel {
    fn from(config: ClientProxyConfig) -> Self {
        ActiveModel {
            id: NotSet,
            key: Set("client_proxy_config".to_string()),
            value: Set(json!({
                "proxyRequests": {
                    "type": config.proxy_requests.proxy_type,
                    "url": config.proxy_requests.url,
                },
                "apiDebug": {
                    "type": config.api_debug.proxy_type,
                    "url": config.api_debug.url,
                }
            })),
            description: Set(Some("Client proxy configuration".to_string())),
        }
    }
}

pub struct ClientProxyDao {
    db: Arc<DatabaseConnection>,
}

impl ClientProxyDao {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }

    pub async fn get_client_proxy_config(&self) -> Result<ClientProxyConfig> {
        let config = AppConfigEntity::find()
            .filter(app_config_mod::Column::Key.eq("client_proxy_config"))
            .one(self.db.as_ref())
            .await?;

        match config {
            Some(model) => {
                let value = model.value;

                let proxy_requests = ProxyConfig {
                    proxy_type: serde_json::from_value(value["proxyRequests"]["type"].clone())
                        .unwrap_or_else(|_| "none".to_string()),
                    url: serde_json::from_value(value["proxyRequests"]["url"].clone())
                        .unwrap_or(None),
                };

                let api_debug = ProxyConfig {
                    proxy_type: serde_json::from_value(value["apiDebug"]["type"].clone())
                        .unwrap_or_else(|_| "none".to_string()),
                    url: serde_json::from_value(value["apiDebug"]["url"].clone()).unwrap_or(None),
                };

                Ok(ClientProxyConfig {
                    proxy_requests,
                    api_debug,
                })
            }
            None => Ok(ClientProxyConfig::default()),
        }
    }

    pub async fn update_client_proxy_config(&self, config: ClientProxyConfig) -> Result<()> {
        let existing = AppConfigEntity::find()
            .filter(app_config_mod::Column::Key.eq("client_proxy_config"))
            .one(self.db.as_ref())
            .await?;

        match existing {
            Some(model) => {
                let mut update: ActiveModel = model.into();
                update.value = Set(json!({
                    "proxyRequests": {
                        "type": config.proxy_requests.proxy_type,
                        "url": config.proxy_requests.url,
                    },
                    "apiDebug": {
                        "type": config.api_debug.proxy_type,
                        "url": config.api_debug.url,
                    }
                }));
                AppConfigEntity::update(update)
                    .exec(self.db.as_ref())
                    .await?;
            }
            None => {
                let model: ActiveModel = Model {
                    id: 0,
                    key: "client_proxy_config".to_string(),
                    value: json!({
                        "proxyRequests": {
                            "type": config.proxy_requests.proxy_type,
                            "url": config.proxy_requests.url,
                        },
                        "apiDebug": {
                            "type": config.api_debug.proxy_type,
                            "url": config.api_debug.url,
                        }
                    }),
                    description: Some("Client proxy configuration".to_string()),
                }
                .into();
                AppConfigEntity::insert(model)
                    .exec(self.db.as_ref())
                    .await?;
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::migration::Migrator;
    use sea_orm::{Database, DatabaseConnection};
    use sea_orm_migration::MigratorTrait;

    async fn setup_test_db() -> DatabaseConnection {
        let db = Database::connect("sqlite::memory:").await.unwrap();
        Migrator::up(&db, None).await.unwrap();
        db
    }

    #[tokio::test]
    async fn test_client_proxy_config_crud() -> Result<()> {
        let db = setup_test_db().await;
        let dao = ClientProxyDao::new(Arc::new(db));

        // Test get default config
        let config = dao.get_client_proxy_config().await?;
        assert_eq!(config.proxy_requests.proxy_type, "none");
        assert_eq!(config.api_debug.proxy_type, "none");

        // Test update config
        let new_config = ClientProxyConfig {
            proxy_requests: ProxyConfig {
                proxy_type: "custom".to_string(),
                url: Some("http://proxy.example.com:8080".to_string()),
            },
            api_debug: ProxyConfig {
                proxy_type: "system".to_string(),
                url: None,
            },
        };

        dao.update_client_proxy_config(new_config.clone()).await?;

        // Test get updated config
        let updated_config = dao.get_client_proxy_config().await?;
        assert_eq!(updated_config.proxy_requests.proxy_type, "custom");
        assert_eq!(
            updated_config.proxy_requests.url,
            Some("http://proxy.example.com:8080".to_string())
        );
        assert_eq!(updated_config.api_debug.proxy_type, "system");
        assert_eq!(updated_config.api_debug.url, None);

        Ok(())
    }
}
