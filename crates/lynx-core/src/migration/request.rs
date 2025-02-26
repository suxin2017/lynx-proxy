use sea_orm::Schema;
use sea_orm_migration::prelude::*;


use crate::entities::prelude::Request;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let builder = manager.get_database_backend();
        let schema = Schema::new(builder);
        let table = builder.build(schema.create_table_from_entity(Request).if_not_exists());

        manager.get_connection().execute(table).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Request).to_owned())
            .await?;
        Ok(())
    }
}
