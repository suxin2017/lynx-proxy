use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let _ = manager
            .create_table(
                Table::create()
                    .table(RuleGroup::Table)
                    .if_not_exists()
                    .col(pk_auto(RuleGroup::Id))
                    .col(string(RuleGroup::Name))
                    .col(string_null(RuleGroup::Description))
                    .col(unsigned(RuleGroup::CreatedAt))
                    .col(unsigned(RuleGroup::UpdatedAt))
                    .to_owned(),
            )
            .await?;
        let _ = manager
            .create_table(
                Table::create()
                    .table(Rule::Table)
                    .if_not_exists()
                    .col(pk_auto(Rule::Id))
                    .col(string(Rule::Match))
                    .col(string(Rule::TargetUri))
                    .col(integer(Rule::RuleGroupId))
                    .col(unsigned(Rule::CreatedAt))
                    .col(unsigned(Rule::UpdatedAt))
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
    Description,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum Rule {
    Table,
    Id,
    RuleGroupId,
    Match,
    TargetUri,
    CreatedAt,
    UpdatedAt,
}
