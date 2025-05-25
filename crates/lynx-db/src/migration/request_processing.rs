use sea_orm::Schema;
use sea_orm_migration::prelude::*;

use crate::entities::prelude::{Capture, Handler, Rule};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let builder = manager.get_database_backend();
        let schema = Schema::new(builder);

        // Create rule table
        let rule_table = builder.build(schema.create_table_from_entity(Rule).if_not_exists());
        manager.get_connection().execute(rule_table).await?;

        // Create capture table
        let capture_table = builder.build(schema.create_table_from_entity(Capture).if_not_exists());
        manager.get_connection().execute(capture_table).await?;

        // Create handler table
        let handler_table = builder.build(schema.create_table_from_entity(Handler).if_not_exists());
        manager.get_connection().execute(handler_table).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop tables in reverse order due to foreign key constraints
        manager
            .drop_table(Table::drop().table(HandlerTable::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(CaptureTable::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(RuleTable::Table).to_owned())
            .await?;
        Ok(())
    }
}

#[derive(DeriveIden)]
enum RuleTable {
    Table,
}

#[derive(DeriveIden)]
enum CaptureTable {
    Table,
}

#[derive(DeriveIden)]
enum HandlerTable {
    Table,
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
    async fn test_migration_up() {
        let _db = setup_test_db().await;
        // Migration successful if no panic occurs
    }
}
