use sea_orm::{ActiveModelTrait, ActiveValue, Schema};
use sea_orm_migration::prelude::*;

use crate::entities::prelude::{Capture, Handler, Rule, RuleGroup};
use crate::entities::rule::rule_group;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let builder = manager.get_database_backend();
        let schema = Schema::new(builder);
        let table = builder.build(schema.create_table_from_entity(RuleGroup).if_not_exists());
        manager.get_connection().execute(table).await?;

        let schema = Schema::new(builder);
        let table = builder.build(schema.create_table_from_entity(Rule).if_not_exists());
        manager.get_connection().execute(table).await?;

        let schema = Schema::new(builder);
        let table = builder.build(schema.create_table_from_entity(Capture).if_not_exists());
        manager.get_connection().execute(table).await?;

        let schema = Schema::new(builder);
        let table = builder.build(schema.create_table_from_entity(Handler).if_not_exists());
        manager.get_connection().execute(table).await?;

        let connect = manager.get_connection();

        rule_group::ActiveModel {
            name: ActiveValue::set("default".to_owned()),
            description: ActiveValue::set(None),
            ..Default::default()
        }
        .insert(connect)
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(RuleGroup).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Rule).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Capture).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Handler).to_owned())
            .await?;
        Ok(())
    }
}
