use std::iter::zip;

use anyhow::anyhow;
use schemars::JsonSchema;
use sea_orm::{
    ColumnTrait, EntityTrait, FromQueryResult, IntoActiveModel, ModelTrait, QueryFilter,
    QuerySelect, RelationTrait, Set, TransactionTrait,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use typeshare::typeshare;

use crate::{
    entities::rule::{
        capture::{self, CaptureType},
        handler, rule,
    },
    self_service::utils::OperationError,
    server_context::DB,
};

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuleContent {
    pub capture: Option<Capture>,
    pub handlers: Vec<Handler>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
#[typeshare]
pub struct Capture {
    pub r#type: CaptureType,
    pub url: String,
}

impl From<capture::Model> for Capture {
    fn from(value: capture::Model) -> Self {
        Self {
            r#type: value.r#type,
            url: value.url,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(tag = "type", content = "data")]
#[serde(rename_all = "camelCase")]
#[typeshare]
pub enum Handler {
    ConnectPassProxyHandler(ConnectPassProxyHandler),
}

impl From<handler::Model> for Handler {
    fn from(value: handler::Model) -> Self {
        match value.r#type {
            handler::HandlerType::ConnectPassProxy => {
                Handler::ConnectPassProxyHandler(ConnectPassProxyHandler {
                    switch: value.switch,
                    url: value.data.get("url").unwrap().as_str().unwrap().to_owned(),
                })
            }
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[typeshare]
pub struct ConnectPassProxyHandler {
    pub switch: bool,
    pub url: String,
}

impl RuleContent {
    pub fn new(capture: Option<Capture>, handlers: Vec<Handler>) -> Self {
        Self { capture, handlers }
    }
}

pub async fn get_all_rule_content() -> anyhow::Result<Vec<RuleContent>> {
    let db = DB.get().unwrap();

    let mut rule_with_capture = rule::Entity::find()
        .find_also_related(capture::Entity)
        .all(db)
        .await
        .map_err(|e| anyhow!(e).context("find rule content error"))?;

    rule_with_capture.sort_by(|a, b| a.0.id.cmp(&b.0.id));

    let rule_with_handlers = rule::Entity::find()
        .find_with_related(handler::Entity)
        .all(db)
        .await
        .map_err(|e| anyhow!(e).context("find rule content error"))?;
    rule_with_capture.sort_by(|a, b| a.0.id.cmp(&b.0.id));

    let zipped = zip(
        rule_with_capture.into_iter(),
        rule_with_handlers.into_iter(),
    );

    let result: Vec<RuleContent> = zipped
        .map(|(a, b)| {
            let (_, capture) = a;
            let (_, handler) = b;
            let capture = capture.map(Capture::from);
            let handlers: Vec<Handler> = handler.into_iter().map(Handler::from).collect();
            RuleContent::new(capture, handlers)
        })
        .collect();

    Ok(result)
}

pub async fn get_rule_content_by_rule_id(rule_id: i32) -> anyhow::Result<Option<RuleContent>> {
    let db = DB.get().unwrap();

    let rule_with_capture = rule::Entity::find_by_id(rule_id)
        .find_also_related(capture::Entity)
        .one(db)
        .await
        .map_err(|e| anyhow!(e).context("find rule content error"))?;

    let rule_with_handlers = rule::Entity::find_by_id(rule_id)
        .find_with_related(handler::Entity)
        .all(db)
        .await
        .map_err(|e| anyhow!(e).context("find rule content error"))?;

    if rule_with_capture.is_none() || rule_with_handlers.is_empty() {
        return Ok(None);
    }

    let (_, capture) = rule_with_capture.unwrap();
    let (_, handler) = rule_with_handlers.into_iter().next().unwrap();
    let capture = capture.map(Capture::from);
    let handlers: Vec<Handler> = handler.into_iter().map(Handler::from).collect();

    Ok(Some(RuleContent::new(capture, handlers)))
}

pub async fn save_content_by_rule_id(
    rule_id: i32,
    rule_content: RuleContent,
) -> anyhow::Result<()> {
    let db = DB.get().unwrap();

    let rule = rule::Entity::find_by_id(rule_id)
        .one(db)
        .await
        .map_err(|e| anyhow!(e).context("find rule error"))?;

    if rule.is_none() {
        return Err(anyhow!(OperationError::new("can not find the rule".into())));
    }

    let rule = rule.unwrap();

    delete_rule_content_by_rule_id(rule.id).await?;

    let txn = db.begin().await?;

    let RuleContent { capture, handlers } = rule_content;

    if let Some(cap) = capture {
        capture::Entity::insert(capture::ActiveModel {
            r#type: Set(CaptureType::Glob),
            url: Set(cap.url),
            rule_id: Set(rule.id),
            ..Default::default()
        })
        .exec(&txn)
        .await
        .map_err(|e| anyhow!(e).context("insert capture error"))?;
    }

    let handlers: Vec<handler::ActiveModel> = handlers
        .into_iter()
        .map(|handler| match handler {
            Handler::ConnectPassProxyHandler(handler) => handler::ActiveModel {
                r#type: Set(handler::HandlerType::ConnectPassProxy),
                data: Set(json!({"url": handler.url})),
                switch: Set(handler.switch),
                rule_id: Set(rule.id),
                ..Default::default()
            },
        })
        .collect();

    let _insert_result = handler::Entity::insert_many(handlers)
        .exec(&txn)
        .await
        .map_err(|e| anyhow!(e).context("insert handler error"))?;

    txn.commit().await?;
    Ok(())
}

pub async fn delete_rule_content_by_rule_id(rule_id: i32) -> anyhow::Result<()> {
    let db = DB.get().unwrap();

    let rule = rule::Entity::find_by_id(rule_id)
        .one(db)
        .await
        .map_err(|e| anyhow!(e).context("find rule error"))?;

    if rule.is_none() {
        return Err(anyhow!(OperationError::new("can not find the rule".into())));
    }
    let txn = db.begin().await?;

    let rule = rule.unwrap();

    capture::Entity::delete_many()
        .filter(capture::Column::RuleId.eq(rule.id))
        .exec(&txn)
        .await
        .map_err(|e| anyhow!(e).context("delete capture error"))?;

    handler::Entity::delete_many()
        .filter(handler::Column::RuleId.eq(rule.id))
        .exec(&txn)
        .await
        .map_err(|e| anyhow!(e).context("delete handler error"))?;

    txn.commit().await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use crate::migration::Migrator;

    use super::*;
    use sea_orm::{ActiveModelTrait, ActiveValue::NotSet, Database, Set};
    use sea_orm_migration::MigratorTrait;
    use serde_json::json;

    #[tokio::test]
    async fn test_rule_content() -> anyhow::Result<()> {
        let db = Database::connect("sqlite::memory:").await?;
        let _ = Migrator::fresh(&db).await;

        let rule = rule::ActiveModel {
            id: NotSet,
            name: Set("v".into()),
            rule_group_id: Set(1),
            created_at: NotSet,
            updated_at: NotSet,
        };
        rule.insert(&db).await?;

        let rule = capture::ActiveModel {
            id: NotSet,
            r#type: Set(CaptureType::Glob),
            url: Set("http://example.com".into()),
            rule_id: Set(1),
        };
        rule.insert(&db).await?;

        let rule = handler::ActiveModel {
            id: NotSet,
            r#type: Set(handler::HandlerType::ConnectPassProxy),
            data: Set(json!({"url": "http://example.com"})),
            switch: Set(true),
            rule_id: Set(1),
        };
        rule.insert(&db).await?;

        // Setup database schema
        DB.set(db).unwrap();

        let result = get_all_rule_content().await.unwrap();

        assert!(!result.is_empty());

        let rule_content = get_rule_content_by_rule_id(1).await;
        rule_content.map(|rule_content| {
            assert!(rule_content.is_some());
        })?;

        println!("{:?}", result);
        let mut new_content = result[0].clone();
        new_content.capture = None;
        save_content_by_rule_id(1, new_content).await?;

        let result = get_all_rule_content().await.unwrap();

        println!("{:?}", result);
        Ok(())
    }
}
