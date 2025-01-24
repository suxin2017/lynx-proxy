use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // let _ = manager
        //     .create_table(
        //         Table::create()
        //             .table(RuleGroup::Table)
        //             .if_not_exists()
        //             .col(pk_auto(RuleGroup::Id))
        //             .col(string(RuleGroup::Name))
        //             .col(string_null(RuleGroup::Description))
        //             .col(unsigned(RuleGroup::CreatedAt))
        //             .col(unsigned(RuleGroup::UpdatedAt))
        //             .to_owned(),
        //     )
        //     .await?;
        // let _ = manager
        //     .create_table(
        //         Table::create()
        //             .table(Rule::Table)
        //             .if_not_exists()
        //             .col(pk_auto(Rule::Id))
        //             .col(string(Rule::Match))
        //             .col(string(Rule::TargetUri))
        //             .col(integer(Rule::RuleGroupId))
        //             .col(unsigned(Rule::CreatedAt))
        //             .col(unsigned(Rule::UpdatedAt))
        //             .to_owned(),
        //     )
        //     .await?;
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
            .values_panic([true.into()])
            .to_owned();
        let _ = manager.exec_stmt(insert).await?;

        let _ = manager
            .create_table(
                Table::create()
                    .table(Request::Table)
                    .if_not_exists()
                    .col(pk_auto(Request::Id))
                    .col(string(Request::Uri))
                    .col(string(Request::TraceId))
                    .col(string(Request::Method))
                    .col(string(Request::Schema))
                    .col(string(Request::Version))
                    .col(integer(Request::StatusCode))
                    .col(string(Request::StatusMessage))
                    .col(string(Request::ClientIp))
                    .col(integer(Request::ClientPort))
                    .col(string_null(Request::ServerIP))
                    .col(integer_null(Request::ServerPort))
                    .col(json(Request::Header))
                    .to_owned(),
            )
            .await?;
        let _ = manager
            .create_index(
                Index::create()
                    .table(Request::Table)
                    .name("request_trace_id")
                    .col(Request::TraceId)
                    .to_owned(),
            )
            .await?;
        let _ = manager
            .create_table(
                Table::create()
                    .table(Response::Table)
                    .if_not_exists()
                    .col(pk_auto(Response::Id))
                    .col(json(Response::Header))
                    .col(integer(Response::RequestId))
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        // manager
        //     .drop_table(Table::drop().table(Rule::Table).to_owned())
        //     .await
        unimplemented!()
    }
}

#[derive(DeriveIden)]
enum AppConfig {
    Table,
    Id,
    CaptureHttps,
}

// #[derive(DeriveIden)]
// enum RuleGroup {
//     Table,
//     Id,
//     Name,
//     Description,
//     CreatedAt,
//     UpdatedAt,
// }

// #[derive(DeriveIden)]
// enum Rule {
//     Table,
//     Id,
//     RuleGroupId,
//     Match,
//     TargetUri,
//     CreatedAt,
//     UpdatedAt,
// }

#[derive(DeriveIden)]
enum Request {
    Table,
    Id,
    Uri,
    TraceId,
    Method,
    Schema,
    Version,
    StatusCode,
    StatusMessage,
    ClientIp,
    ClientPort,
    ServerIP,
    ServerPort,
    Header,
}

#[derive(DeriveIden)]
enum Response {
    Table,
    Id,
    Header,
    RequestId,
}
