use sea_orm::Schema;
use sea_orm_migration::prelude::*;

use crate::entities::api_debug_tree::{Entity as ApiDebugTree, Column};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 创建api_debug_tree表
        let builder = manager.get_database_backend();
        let schema = Schema::new(builder);
        let table = builder.build(schema.create_table_from_entity(ApiDebugTree).if_not_exists());
        manager.get_connection().execute(table).await?;

        // 创建索引
        manager
            .create_index(
                Index::create()
                    .name("idx_api_debug_tree_parent_id")
                    .table(ApiDebugTree)
                    .col(Column::ParentId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_api_debug_tree_api_debug_id")
                    .table(ApiDebugTree)
                    .col(Column::ApiDebugId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_api_debug_tree_sort_order")
                    .table(ApiDebugTree)
                    .col(Column::ParentId)
                    .col(Column::SortOrder)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(ApiDebugTree).to_owned())
            .await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sea_orm::{Database, EntityTrait, PaginatorTrait};

    #[tokio::test]
    async fn test_migration() {
        let db = Database::connect("sqlite::memory:").await.unwrap();

        // 只运行当前迁移，而不是所有迁移
        let manager = SchemaManager::new(&db);
        let migration = Migration;
        migration.up(&manager).await.unwrap();

        // 验证表是否存在（通过尝试查询）
        use crate::entities::api_debug_tree::Entity;
        let count = Entity::find().count(&db).await.unwrap();
        assert_eq!(count, 0);

        // 回滚迁移
        migration.down(&manager).await.unwrap();
    }
}