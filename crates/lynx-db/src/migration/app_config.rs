use sea_orm::{ActiveModelTrait, ActiveValue::NotSet, EntityTrait, Schema, Set};
use sea_orm_migration::prelude::*;
use serde_json::json;

use crate::{
    dao::net_request_dao::CaptureSwitch,
    entities::{
        app_config::{self, ActiveModel, Model},
        prelude::AppConfig,
    },
};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 创建表
        let builder = manager.get_database_backend();
        let schema = Schema::new(builder);
        let table = builder.build(schema.create_table_from_entity(AppConfig).if_not_exists());
        manager.get_connection().execute(table).await?;

        // 初始化抓包开关配置
        let capture_switch = ActiveModel::from(Model::from(CaptureSwitch::default()));

        let db = manager.get_connection();
        app_config::Entity::insert(capture_switch).exec(db).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(AppConfig).to_owned())
            .await?;
        Ok(())
    }
}
