use crate::entities::{rule, rule_content, rule_group};
use crate::self_service::api::schemas::{
    RULE_GROUP_DELETE_PARAMS_SCHEMA, RULE_GROUP_UPDATE_PARAMS_SCHEMA, RULE_UPDATE_PARAMS_SCHEMA,
};
use crate::self_service::utils::{
    get_body_json, get_query_params, response_ok, OperationError, ValidateError,
};
use crate::server_context::DB;
use crate::utils::full;
use anyhow::{anyhow, Error, Result};
use bytes::Bytes;
use http::header::CONTENT_TYPE;
use http_body_util::combinators::BoxBody;
use hyper::body::Incoming;
use hyper::{Request, Response};
use sea_orm::{
    ActiveModelTrait, ActiveValue, ColumnTrait, Condition, EntityTrait, IntoActiveModel,
    ModelTrait, QueryFilter,
};
use serde::{Deserialize, Serialize};
use serde_json::json;

use super::schemas::{RULE_ADD_PARAMS_SCHEMA, RULE_DELETE_PARAMS_SCHEMA, RULE_GROUP_ADD_PARAMS_SCHEMA};

#[derive(Debug, Deserialize, Serialize)]
struct RuleAddParams {
    rule_group_id: i32,
    name: String,
}

pub async fn handle_rule_add(req: Request<Incoming>) -> Result<Response<BoxBody<Bytes, Error>>> {
    let db = DB.get().unwrap();
    let add_params: serde_json::Value = get_body_json(req.into_body()).await?;
    jsonschema::validate(&RULE_ADD_PARAMS_SCHEMA, &add_params)
        .map_err(|e| anyhow!(ValidateError::new(format!("{}", e))))?;
    let add_params: RuleAddParams = serde_json::from_value(add_params)?;

    let active_model = rule::ActiveModel {
        name: ActiveValue::set(add_params.name),
        rule_group_id: ActiveValue::set(add_params.rule_group_id),
        ..Default::default()
    };
    let res = active_model.insert(db).await?;
    response_ok(res)
}

#[derive(Debug, Deserialize, Serialize)]
struct RuleUpdateParams {
    id: i32,
    name: String,
}

pub async fn handle_rule_update(req: Request<Incoming>) -> Result<Response<BoxBody<Bytes, Error>>> {
    let body_json: serde_json::Value = get_body_json(req.into_body()).await?;
    jsonschema::validate(&RULE_UPDATE_PARAMS_SCHEMA, &body_json)
        .map_err(|e| anyhow!(ValidateError::new(format!("{}", e))))?;
    let body_params: RuleUpdateParams = serde_json::from_value(body_json)?;

    let active_model = rule::ActiveModel {
        id: ActiveValue::set(body_params.id),
        name: ActiveValue::set(body_params.name),
        ..Default::default()
    };
    let res = active_model.update(DB.get().unwrap()).await?;

    return response_ok(res);
}

#[derive(Debug, Deserialize, Serialize)]
struct RuleDeleteParams {
    id: i32,
}

pub async fn handle_rule_delete(req: Request<Incoming>) -> Result<Response<BoxBody<Bytes, Error>>> {
    let body_json: serde_json::Value = get_body_json(req.into_body()).await?;
    jsonschema::validate(&RULE_DELETE_PARAMS_SCHEMA, &body_json)
        .map_err(|e| anyhow!(ValidateError::new(format!("{}", e))))?;
    let body_params: RuleDeleteParams = serde_json::from_value(body_json)?;

    let active_model = rule_group::ActiveModel {
        id: ActiveValue::set(body_params.id),
        ..Default::default()
    };
    let res = active_model.delete(DB.get().unwrap()).await?;

    if res.rows_affected == 0 {
        return Err(anyhow!(OperationError::new(
            "can not find the rule group".to_string()
        )));
    }

    response_ok::<Option<()>>(None)
}

pub async fn handle_rule_detail(req: Request<Incoming>) -> Result<Response<BoxBody<Bytes, Error>>> {
    let query_params = get_query_params(req.uri());
    let id = query_params
        .get("id")
        .ok_or_else(|| anyhow!(ValidateError::new("name is required".to_string())))?;
    let id = id
        .parse::<i32>()
        .map_err(|_| anyhow!(ValidateError::new("id must be a number".to_string())))?;

    let rule = rule::Entity::find_by_id(id).one(DB.get().unwrap()).await?;

    let rule =
        rule.ok_or_else(|| anyhow!(OperationError::new("can not find the rule".to_string())))?;

    let content = rule
        .find_related(rule_content::Entity)
        .one(DB.get().unwrap())
        .await?;

    if let Some(content) = content {
        return response_ok(content);
    } else {
        let rule_content = rule_content::ActiveModel {
            rule_id: ActiveValue::set(rule.id),
            content: ActiveValue::set(json!({})),
            ..Default::default()
        }
        .insert(DB.get().unwrap())
        .await?;
        return response_ok(rule_content);
    }
}
