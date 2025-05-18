use anyhow::Result;
use sea_orm::*;
use sea_orm_migration::seaql_migrations::Entity;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use utoipa::ToSchema;

use crate::entities::app_config::{
    self as app_config_mod, ActiveModel, Entity as AppConfigEntity, Model,
};

#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DomainFilter {
    #[schema(example = "example.com")]
    pub domain: String,
    #[schema(example = true)]
    pub enabled: bool,
    #[schema(minimum = 0, maximum = 65535, example = 443)]
    pub port: u16,
}

#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CaptureFilter {
    pub include_domains: Vec<DomainFilter>,
    pub exclude_domains: Vec<DomainFilter>,
    pub enabled: bool,
}

impl Default for DomainFilter {
    fn default() -> Self {
        Self {
            domain: "".to_string(),
            enabled: false,
            port: 8080,
        }
    }
}

impl Default for CaptureFilter {
    fn default() -> Self {
        Self {
            include_domains: vec![],
            exclude_domains: vec![],
            enabled: false,
        }
    }
}

impl From<CaptureFilter> for ActiveModel {
    fn from(filter: CaptureFilter) -> Self {
        ActiveModel {
            id: NotSet,
            key: Set("https_capture_filter".to_string()),
            value: Set(json!({
                "includeDomains": filter.include_domains,
                "excludeDomains": filter.exclude_domains,
                "enabled": filter.enabled,
            })),
            description: Set(Some("HTTPS capture filter configuration".to_string())),
        }
    }
}

pub struct HttpsCaptureDao {
    db: Arc<DatabaseConnection>,
}

impl HttpsCaptureDao {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }

    pub async fn get_capture_filter(&self) -> Result<CaptureFilter> {
        let config = AppConfigEntity::find()
            .filter(app_config_mod::Column::Key.eq("https_capture_filter"))
            .one(self.db.as_ref())
            .await?;

        match config {
            Some(model) => {
                let value = model.value;
                Ok(CaptureFilter {
                    include_domains: serde_json::from_value(value["includeDomains"].clone())?,
                    exclude_domains: serde_json::from_value(value["excludeDomains"].clone())?,
                    enabled: serde_json::from_value(value["enabled"].clone())?,
                })
            }
            None => Ok(CaptureFilter::default()),
        }
    }

    pub async fn update_capture_filter(&self, filter: CaptureFilter) -> Result<()> {
        let existing = AppConfigEntity::find()
            .filter(app_config_mod::Column::Key.eq("https_capture_filter"))
            .one(self.db.as_ref())
            .await?;

        match existing {
            Some(model) => {
                let mut update: ActiveModel = model.into();
                update.value = Set(json!({
                    "includeDomains": filter.include_domains,
                    "excludeDomains": filter.exclude_domains,
                    "enabled": filter.enabled,
                }));
                AppConfigEntity::update(update)
                    .exec(self.db.as_ref())
                    .await?;
            }
            None => {
                let model: ActiveModel = Model {
                    id: 0,
                    key: "https_capture_filter".to_string(),
                    value: json!({
                        "includeDomains": filter.include_domains,
                        "excludeDomains": filter.exclude_domains,
                        "enabled": filter.enabled,
                    }),
                    description: Some("HTTPS capture filter configuration".to_string()),
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
