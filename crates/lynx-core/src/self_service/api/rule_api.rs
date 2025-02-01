use crate::entities::{rule, rule_content, rule_group};
use crate::self_service::api::schemas::RULE_UPDATE_PARAMS_SCHEMA;
use crate::self_service::utils::{
    get_body_json, get_query_params, response_ok, OperationError, ValidateError,
};
use crate::server_context::DB;
use anyhow::{anyhow, Error, Result};
use bytes::Bytes;
use http_body_util::combinators::BoxBody;
use hyper::body::Incoming;
use hyper::{Request, Response};
use sea_orm::{
    ActiveModelTrait, ActiveValue, EntityTrait, IntoActiveModel, ModelTrait, TransactionTrait,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tracing::{error, info};

use super::schemas::{RULE_ADD_PARAMS_SCHEMA, RULE_DELETE_PARAMS_SCHEMA};

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
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

    let txn = db.begin().await?;
    let active_model = rule::ActiveModel {
        name: ActiveValue::set(add_params.name),
        rule_group_id: ActiveValue::set(add_params.rule_group_id),
        ..Default::default()
    };
    let res = active_model.insert(&txn).await?;

    let content_active_model = rule_content::ActiveModel {
        content: ActiveValue::set(json!({})),
        rule_id: ActiveValue::set(res.id),
        ..Default::default()
    };
    content_active_model.insert(&txn).await?;
    txn.commit().await?;

    response_ok(res)
}

#[derive(Debug, Deserialize, Serialize)]
struct RuleUpdateParams {
    id: i32,
    name: Option<String>,
    content: Option<serde_json::Value>,
}

pub async fn handle_rule_update(req: Request<Incoming>) -> Result<Response<BoxBody<Bytes, Error>>> {
    let body_json: serde_json::Value = get_body_json(req.into_body()).await?;
    jsonschema::validate(&RULE_UPDATE_PARAMS_SCHEMA, &body_json)
        .map_err(|e| anyhow!(ValidateError::new(format!("{}", e))))?;
    let body_params: RuleUpdateParams = serde_json::from_value(body_json)?;
    info!("update rule: {:?}", body_params);
    let db = DB.get().unwrap();

    let rule = rule::Entity::find_by_id(body_params.id).one(db).await?;

    if let Some(mut rule) = rule {
        if let Some(rule_content) = body_params.content {
            let content = rule.find_related(rule_content::Entity).one(db).await?;
            if let Some(content) = content {
                let mut content_active = content.into_active_model();
                content_active.content = ActiveValue::set(rule_content);
                let res = content_active.update(db).await?;
                info!("update content: {:?}", res);
            }
        }
        if let Some(name) = body_params.name {
            rule.name = name;
        }
        let active_model = rule.into_active_model();
        let res = active_model.update(db).await?;
        return response_ok(res);
    } else {
        return Err(anyhow!(OperationError::new(
            "can not find the rule".to_string()
        )));
    }
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

    let db = DB.get().unwrap();
    let rule = rule::Entity::find_by_id(body_params.id)
        .find_also_related(rule_content::Entity)
        .one(DB.get().unwrap())
        .await?;

    if let Some(rule) = rule {
        let txn = db.begin().await?;
        rule.0.delete(&txn).await?;

        if let Some(content) = rule.1 {
            content.delete(&txn).await?;
        }

        if let Err(e) = txn.commit().await {
            error!("commit error: {:?}", e);
            return Err(anyhow!(OperationError::new(
                "delete rule failed".to_string()
            )));
        }
    } else {
        return Err(anyhow!(OperationError::new(
            "can not find the rule".to_string()
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
