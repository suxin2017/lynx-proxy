use sea_orm::{ActiveModelTrait, ActiveValue::NotSet, Schema, Set};
use sea_orm_migration::prelude::*;

use crate::entities::{
    app_config::{self},
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

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(AppConfig).to_owned())
            .await?;
        Ok(())
    }
}
