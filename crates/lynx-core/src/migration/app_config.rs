use sea_orm::{
    ActiveModelTrait,
    ActiveValue::{NotSet}, Schema, Set,
};
use sea_orm_migration::prelude::*;

use serde_json::json;

use crate::entities::{
    app_config::{self, RecordingStatus},
    prelude::AppConfig,
};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let builder = manager.get_database_backend();
        let schema = Schema::new(builder);
        let table = builder.build(schema.create_table_from_entity(AppConfig).if_not_exists());

        manager.get_connection().execute(table).await?;

        let default_app_config = app_config::ActiveModel {
            id: NotSet,
            recording_status: Set(RecordingStatus::StartRecording),
            capture_ssl: Set(true),
            ssl_config: Set(Some(json!({
                "includeDomains": [{
                    "host": "*",
                    "port": null,
                    "switch": true
                }],
                "excludeDomains": []
            }))),
        };

        default_app_config.insert(manager.get_connection()).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(AppConfig).to_owned())
            .await?;
        Ok(())
    }
}
