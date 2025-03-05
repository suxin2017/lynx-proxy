use crate::bo::rule_content::{
    Capture, Handler, RuleContent, delete_rule_content_by_rule_id, get_rule_content_by_rule_id,
    save_content_by_rule_id,
};
use crate::entities::response;
use crate::entities::rule::rule;
use crate::self_service::utils::{
    OperationError, ResponseBox, ValidateError, ok, parse_body_params, parse_query_params,
    response_ok,
};
use crate::server_context::DB;
use anyhow::{Error, Result, anyhow};
use bytes::Bytes;
use http_body_util::combinators::BoxBody;
use hyper::body::Incoming;
use hyper::{Request, Response};
use schemars::{JsonSchema, schema_for};
use sea_orm::{
    ActiveModelTrait, ActiveValue, EntityTrait, IntoActiveModel, ModelTrait, TransactionTrait,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tracing::error;
use typeshare::typeshare;

#[derive(Debug, Deserialize, Serialize, JsonSchema)]
#[typeshare]
#[serde(rename_all = "camelCase")]
struct AddRuleParams {
    rule_group_id: i32,
    name: String,
}

pub async fn handle_add_rule(req: Request<Incoming>) -> Result<Response<BoxBody<Bytes, Error>>> {
    let db = DB.get().unwrap();
    let add_params: AddRuleParams =
        parse_body_params(req.into_body(), schema_for!(AddRuleParams)).await?;

    let txn = db.begin().await?;
    let active_model = rule::ActiveModel {
        name: ActiveValue::set(add_params.name),
        rule_group_id: ActiveValue::set(add_params.rule_group_id),
        ..Default::default()
    };
    let res = active_model.insert(&txn).await?;

    txn.commit().await?;

    response_ok(res)
}

#[derive(Debug, Deserialize, Serialize, JsonSchema)]
#[typeshare]
struct UpdateRuleNameParams {
    id: i32,
    name: Option<String>,
}

pub async fn handle_update_rule_name(
    req: Request<Incoming>,
) -> Result<Response<BoxBody<Bytes, Error>>> {
    let body_params: UpdateRuleNameParams =
        parse_body_params(req.into_body(), schema_for!(UpdateRuleNameParams)).await?;

    let db = DB.get().unwrap();

    let rule = rule::Entity::find_by_id(body_params.id).one(db).await?;

    if let Some(rule) = rule {
        if let Some(name) = body_params.name {
            let mut rule = rule.into_active_model();
            rule.name = ActiveValue::set(name);
            let res = rule.update(db).await?;
            response_ok(res)
        } else {
            Err(anyhow!(OperationError::new("name is required".into())))
        }
    } else {
        Err(anyhow!(OperationError::new("can not find the rule".into())))
    }
}

#[derive(Debug, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
#[typeshare]
struct RuleUpdateContentParams {
    id: i32,
    capture: Capture,
    handlers: Vec<Handler>,
}

#[derive(Debug, Deserialize, Serialize)]
#[typeshare]
struct UpdateRuleContentBody(ResponseBox<Option<()>>);

pub async fn handle_update_rule_content(
    req: Request<Incoming>,
) -> Result<Response<BoxBody<Bytes, Error>>> {
    let body_params: RuleUpdateContentParams =
        parse_body_params(req.into_body(), schema_for!(RuleUpdateContentParams)).await?;

    save_content_by_rule_id(
        body_params.id,
        RuleContent::new(Some(body_params.capture), body_params.handlers),
    )
    .await?;

    response_ok::<Option<()>>(None)
}

#[derive(Debug, Deserialize, Serialize, JsonSchema)]
#[typeshare]
struct DeleteRuleParams {
    id: i32,
}

#[derive(Debug, Deserialize, Serialize)]
#[typeshare]
struct DeleteRuleBody(ResponseBox<Option<()>>);

pub async fn handle_delete_rule(req: Request<Incoming>) -> Result<Response<BoxBody<Bytes, Error>>> {
    let body_params: DeleteRuleParams =
        parse_body_params(req.into_body(), schema_for!(DeleteRuleParams)).await?;

    let db = DB.get().unwrap();

    delete_rule_content_by_rule_id(body_params.id).await?;
    let result = rule::Entity::delete_by_id(body_params.id).exec(db).await?;

    if result.rows_affected > 0 {
        response_ok::<Option<()>>(None)
    } else {
        Err(anyhow!(OperationError::new("can not find the rule".into())))
    }
}

#[derive(Debug, Deserialize, Serialize)]
#[typeshare]
struct RuleDetailBody(ResponseBox<RuleContent>);

pub async fn handle_rule_detail(req: Request<Incoming>) -> Result<Response<BoxBody<Bytes, Error>>> {
    let query_params = parse_query_params(req.uri());

    let id = query_params
        .get("id")
        .ok_or_else(|| anyhow!(ValidateError::new("name is required".to_string())))?;

    let id = id
        .parse::<i32>()
        .map_err(|_| anyhow!(ValidateError::new("id must be a number".to_string())))?;

    let rule_content = get_rule_content_by_rule_id(id).await?;

    if let Some(rule_content) = rule_content {
        response_ok(rule_content)
    } else {
        let rule_content = RuleContent::new(None, vec![]);
        response_ok(rule_content)
    }
}
