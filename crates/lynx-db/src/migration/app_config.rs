use sea_orm::{EntityTrait, Schema};
use sea_orm_migration::prelude::*;

use crate::{
    dao::{https_capture_dao::CaptureFilter, net_request_dao::CaptureSwitch},
    entities::{
        app_config::{self, ActiveModel},
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
        let capture_switch = ActiveModel::from(CaptureSwitch::default());

        let db = manager.get_connection();
        app_config::Entity::insert(capture_switch).exec(db).await?;

        // 初始化抓包过滤器配置
        let capture_filter = ActiveModel::from(CaptureFilter::default());

        app_config::Entity::insert(capture_filter).exec(db).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(AppConfig).to_owned())
            .await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::migration::Migrator;
    use sea_orm::ColumnTrait;
    use sea_orm::{Database, DatabaseConnection, EntityTrait, QueryFilter};
    use sea_orm_migration::MigratorTrait;

    async fn setup_test_db() -> DatabaseConnection {
        let db = Database::connect("sqlite::memory:").await.unwrap();
        Migrator::up(&db, None).await.unwrap();
        db
    }

    #[tokio::test]
    async fn test_migration_up() {
        let db = setup_test_db().await;
        let manager = SchemaManager::new(&db);

        // Run the migration
        let migration = Migration;
        migration.up(&manager).await.unwrap();

        // Verify CaptureSwitch initialization
        let capture_switch = app_config::Entity::find()
            .filter(app_config::Column::Key.eq("capture_switch"))
            .one(&db)
            .await
            .unwrap();
        assert!(capture_switch.is_some());

        // Verify CaptureFilter initialization
        let capture_filter = app_config::Entity::find()
            .filter(app_config::Column::Key.eq("https_capture_filter"))
            .one(&db)
            .await
            .unwrap();
        assert!(capture_filter.is_some());
    }

    #[tokio::test]
    async fn test_migration_down() {
        let db = setup_test_db().await;
        let manager = SchemaManager::new(&db);

        // Run the migration up and then down
        let migration = Migration;
        migration.up(&manager).await.unwrap();
        migration.down(&manager).await.unwrap();

        // Verify the table is dropped
        let result = app_config::Entity::find().one(&db).await;
        assert!(result.is_err());
    }
}
