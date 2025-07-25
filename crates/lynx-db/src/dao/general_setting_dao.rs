use crate::entities::app_config::{self, ActiveModel, Entity};
use anyhow::Result;
use sea_orm::*;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
#[serde(rename_all = "camelCase")]
pub enum ConnectType {
    #[serde(rename = "0")]
    ShortPoll = 0,
    #[serde(rename = "1")]
    SSE = 1,
}

impl Default for ConnectType {
    fn default() -> Self {
        ConnectType::SSE
    }
}

#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GeneralSetting {
    pub max_log_size: i32,
    pub connect_type: ConnectType,
    pub language: String,
}

impl Default for GeneralSetting {
    fn default() -> Self {
        Self {
            max_log_size: 1000,
            connect_type: ConnectType::default(),
            language: "zh-CN".to_string(),
        }
    }
}

impl From<GeneralSetting> for ActiveModel {
    fn from(setting: GeneralSetting) -> Self {
        ActiveModel {
            id: NotSet,
            key: Set("general_setting".to_string()),
            value: Set(json!({
                "maxLogSize": setting.max_log_size,
                "connectType": setting.connect_type,
                "language": setting.language,
            })),
            description: Set(Some("General application settings".to_string())),
        }
    }
}

pub struct GeneralSettingDao {
    db: Arc<DatabaseConnection>,
}

impl GeneralSettingDao {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }

    pub async fn get_general_setting(&self) -> Result<GeneralSetting> {
        let config = Entity::find()
            .filter(app_config::Column::Key.eq("general_setting"))
            .one(self.db.as_ref())
            .await?;

        match config {
            Some(model) => {
                let max_log_size = model.value.get("maxLogSize")
                    .and_then(|v| v.as_i64())
                    .map(|v| v as i32)
                    .unwrap_or(1000);
                
                let connect_type = model.value.get("connectType")
                    .and_then(|v| serde_json::from_value(v.clone()).ok())
                    .unwrap_or_default();

                let language = model.value.get("language")
                    .and_then(|v| v.as_str())
                    .unwrap_or("en")
                    .to_string();

                Ok(GeneralSetting {
                    max_log_size,
                    connect_type,
                    language,
                })
            }
            None => Ok(GeneralSetting::default()),
        }
    }

    pub async fn update_general_setting(&self, setting: GeneralSetting) -> Result<()> {
        let existing = Entity::find()
            .filter(app_config::Column::Key.eq("general_setting"))
            .one(self.db.as_ref())
            .await?;

        match existing {
            Some(model) => {
                let mut update: ActiveModel = model.into();
                update.value = Set(json!({
                    "maxLogSize": setting.max_log_size,
                    "connectType": setting.connect_type,
                    "language": setting.language,
                }));
                Entity::update(update).exec(self.db.as_ref()).await?;
            }
            None => {
                let model: ActiveModel = setting.into();
                Entity::insert(model).exec(self.db.as_ref()).await?;
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::migration::Migrator;
    use sea_orm::Database;
    use sea_orm_migration::MigratorTrait;

    async fn setup_test_db() -> DatabaseConnection {
        let db = Database::connect("sqlite::memory:").await.unwrap();
        Migrator::up(&db, None).await.unwrap();
        db
    }

    #[tokio::test]
    async fn test_get_default_general_setting() {
        let db = setup_test_db().await;
        let dao = GeneralSettingDao::new(Arc::new(db));

        let setting = dao.get_general_setting().await.unwrap();
        assert_eq!(setting.max_log_size, 1000);
        assert!(matches!(setting.connect_type, ConnectType::SSE));
    }

    #[tokio::test]
    async fn test_update_and_get_general_setting() {
        let db = setup_test_db().await;
        let dao = GeneralSettingDao::new(Arc::new(db));

        let new_setting = GeneralSetting {
            max_log_size: 2000,
            connect_type: ConnectType::SSE,
            language: "zh-CN".to_string(),
        };

        dao.update_general_setting(new_setting.clone()).await.unwrap();
        let retrieved_setting = dao.get_general_setting().await.unwrap();

        assert_eq!(retrieved_setting.max_log_size, 2000);
        assert!(matches!(retrieved_setting.connect_type, ConnectType::SSE));
    }

    #[tokio::test]
    async fn test_update_existing_general_setting() {
        let db = setup_test_db().await;
        let dao = GeneralSettingDao::new(Arc::new(db));

        // First insert
        let initial_setting = GeneralSetting {
            max_log_size: 1500,
            connect_type: ConnectType::ShortPoll,
            language: "en".to_string(),
        };
        dao.update_general_setting(initial_setting).await.unwrap();

        // Update existing
        let updated_setting = GeneralSetting {
            max_log_size: 3000,
            connect_type: ConnectType::SSE,
            language: "fr".to_string(),
        };
        dao.update_general_setting(updated_setting).await.unwrap();

        let retrieved_setting = dao.get_general_setting().await.unwrap();
        assert_eq!(retrieved_setting.max_log_size, 3000);
        assert!(matches!(retrieved_setting.connect_type, ConnectType::SSE));
    }
}