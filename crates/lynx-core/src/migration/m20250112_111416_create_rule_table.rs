use sea_orm::{ActiveModelTrait, ActiveValue};
use sea_orm_migration::{prelude::*, schema::*};

use serde_json::json;

use crate::entities::{app_config::RecordingStatus, rule, rule_content, rule_group};

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
                    .col(string(Rule::Name))
                    .col(integer(Rule::RuleGroupId))
                    .col(unsigned(Rule::CreatedAt))
                    .col(unsigned(Rule::UpdatedAt))
                    .to_owned(),
            )
            .await?;
        let _ = manager
            .create_table(
                Table::create()
                    .table(RuleContent::Table)
                    .if_not_exists()
                    .col(pk_auto(RuleContent::Id))
                    .col(integer(RuleContent::RuleId))
                    .col(json(RuleContent::Content))
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
                    .col(string(AppConfig::RecordingStatus))
                    .to_owned(),
            )
            .await?;
        let insert = Query::insert()
            .into_table(AppConfig::Table)
            .columns([AppConfig::CaptureHttps, AppConfig::RecordingStatus])
            .values_panic([true.into(), RecordingStatus::StartRecording.into()])
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
                    .col(integer_null(Request::StatusCode))
                    .col(json(Request::Header))
                    .col(integer(Request::HeaderSize))
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
                    .col(string(Response::TraceId))
                    .col(json(Response::Header))
                    .col(integer(Response::RequestId))
                    .col(integer(Response::HeaderSize))
                    .to_owned(),
            )
            .await?;

        let connect = manager.get_connection();

        let rule_group = rule_group::ActiveModel {
            name: ActiveValue::set("default".to_owned()),
            description: ActiveValue::set(None),
            ..Default::default()
        }
        .insert(connect)
        .await?;

        let rule = rule::ActiveModel {
            name: ActiveValue::set("default_rule".to_owned()),
            rule_group_id: ActiveValue::set(rule_group.id),
            ..Default::default()
        }
        .insert(connect)
        .await?;

        let rule_content = rule_content::ActiveModel {
            rule_id: ActiveValue::set(rule.id),
            content: ActiveValue::set(json!({
                "demo": "demo"
            })),
            ..Default::default()
        }
        .insert(connect)
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Request::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Response::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(RuleGroup::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Rule::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(RuleContent::Table).to_owned())
            .await?;
        Ok(())
    }
}

#[derive(DeriveIden)]
enum AppConfig {
    Table,
    Id,
    CaptureHttps,
    RecordingStatus,
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
    Name,
    RuleGroupId,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum RuleContent {
    Table,
    Id,
    RuleId,
    Content,
}

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
    Header,
    HeaderSize,
}

#[derive(DeriveIden)]
enum Response {
    Table,
    Id,
    Header,
    RequestId,
    TraceId,
    HeaderSize,
}
