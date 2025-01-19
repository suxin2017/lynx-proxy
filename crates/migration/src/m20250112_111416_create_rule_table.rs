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
        let _ = manager
            .create_table(
                Table::create()
                    .table(AppConfig::Table)
                    .if_not_exists()
                    .col(pk_auto(AppConfig::Id))
                    .col(boolean(AppConfig::CaptureHttps))
                    .to_owned(),
            )
            .await?;
        let insert = Query::insert()
            .into_table(AppConfig::Table)
            .columns([AppConfig::CaptureHttps])
            .values_panic([false.into()])
            .to_owned();
        let _ = manager.exec_stmt(insert).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Rule::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum AppConfig {
    Table,
    Id,
    CaptureHttps,
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

#[derive(DeriveIden)]
enum Session {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum Stream {
    Table,
    Id,
    RequestId,
    ResponseId,
}

#[derive(DeriveIden)]
enum Request {
    Table,
    Id,
    Uri,
    Method,
    HttpVersion,
    StatusCode,
    StatusMessage,
    ClientIp,
    ClientPort,
    ServerIP,
    ServerPort,
    BodyId,
}

#[derive(DeriveIden)]
enum Raw {
    Table,
    Id,
    Path,
}

#[derive(DeriveIden)]
enum Body {
    Id,
    Raw,
}

// #[derive(DeriveIden)]
// enum Session {
//     Table,
//     Id,
//     RequestId,
//     ResponseId,
// }
