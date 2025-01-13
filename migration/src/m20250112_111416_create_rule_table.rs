use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let _= manager
        .create_table(
            Table::create()
                .table(RuleGroup::Table)
                .if_not_exists()
                .col(pk_auto(RuleGroup::Id))
                .col(string(RuleGroup::Name))
                .col(string_null(RuleGroup::Description))
                .to_owned(),
        )
        .await?;
       let _= manager
            .create_table(
                Table::create()
                    .table(Rule::Table)
                    .if_not_exists()
                    .col(pk_auto(Rule::Id))
                    .col(string(Rule::Match))
                    .col(string(Rule::TargetUri))
                    .col(integer(Rule::RuleGroupId))
                    .to_owned(),
            )
            .await?;
      

            
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Rule::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum RuleGroup {
    Table,
    Id,
    Name,
    Description
}


#[derive(DeriveIden)]
enum Rule {
    Table,
    Id,
    RuleGroupId,
    Match,
    TargetUri,
}
