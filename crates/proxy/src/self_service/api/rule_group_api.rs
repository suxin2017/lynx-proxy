use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

use crate::entities::prelude::Rule;
use crate::entities::{rule, rule_group};
use crate::self_service::api::schemas::{
    RULE_GROUP_DELETE_PARAMS_SCHEMA, RULE_GROUP_UPDATE_PARAMS_SCHEMA,
};
use crate::self_service::utils::{
    get_body_json, ok, response_ok, validate_error, OperationError, ValidateError,
};
use crate::server_context::ServerContext;
use crate::utils::full;
use anyhow::{anyhow, Error, Result};
use bytes::{Buf, Bytes};
use http::header::CONTENT_TYPE;
use http::method;
use http_body_util::combinators::BoxBody;
use http_body_util::BodyExt;
use hyper::body::{self, Incoming};
use hyper::{Request, Response};
use sea_orm::{
    ActiveModelBehavior, ActiveModelTrait, ActiveValue, DatabaseConnection, EntityTrait,
};
use serde::{Deserialize, Serialize};

use super::schemas::RULE_GROUP_ADD_PARAMS_SCHEMA;

#[derive(Debug, Deserialize, Serialize)]
struct RuleGroupAddParams {
    name: String,
    description: Option<String>,
}

pub async fn handle_rule_group_add(
    ctx: Arc<ServerContext>,
    req: Request<Incoming>,
) -> Result<Response<BoxBody<Bytes, Error>>> {
    let group_add_params: serde_json::Value = get_body_json(req.into_body()).await?;
    jsonschema::validate(&RULE_GROUP_ADD_PARAMS_SCHEMA, &group_add_params)
        .map_err(|e| anyhow!(ValidateError::new(format!("{}", e))))?;
    let group_add_params: RuleGroupAddParams = serde_json::from_value(group_add_params)?;

    let active_model = rule_group::ActiveModel {
        name: ActiveValue::set(group_add_params.name),
        description: ActiveValue::set(group_add_params.description),
        ..Default::default()
    };
    let res = active_model.insert(&ctx.db).await?;
    return response_ok(res);
}

#[derive(Debug, Deserialize, Serialize)]
struct RuleGroupUpdateParams {
    id: i32,
    name: String,
    description: Option<String>,
}

pub async fn handle_rule_group_update(
    ctx: Arc<ServerContext>,
    req: Request<Incoming>,
) -> Result<Response<BoxBody<Bytes, Error>>> {
    let body_json: serde_json::Value = get_body_json(req.into_body()).await?;
    jsonschema::validate(&RULE_GROUP_UPDATE_PARAMS_SCHEMA, &body_json)
        .map_err(|e| anyhow!(ValidateError::new(format!("{}", e))))?;
    let body_params: RuleGroupUpdateParams = serde_json::from_value(body_json)?;

    let active_model = rule_group::ActiveModel {
        id: ActiveValue::set(body_params.id),
        name: ActiveValue::set(body_params.name),
        description: ActiveValue::set(body_params.description),
        ..Default::default()
    };
    let res = active_model.update(&ctx.db).await?;
    dbg!(&res);

    Ok(Response::builder()
        .header(CONTENT_TYPE, "application/json")
        .body(full(Bytes::from("{}")))?)
}

#[derive(Debug, Deserialize, Serialize)]
struct RuleGroupDeleteParams {
    id: i32,
}

pub async fn handle_rule_group_delete(
    ctx: Arc<ServerContext>,
    req: Request<Incoming>,
) -> Result<Response<BoxBody<Bytes, Error>>> {
    let body_json: serde_json::Value = get_body_json(req.into_body()).await?;
    jsonschema::validate(&RULE_GROUP_DELETE_PARAMS_SCHEMA, &body_json)
        .map_err(|e| anyhow!(ValidateError::new(format!("{}", e))))?;
    let body_params: RuleGroupDeleteParams = serde_json::from_value(body_json)?;

    let active_model = rule_group::ActiveModel {
        id: ActiveValue::set(body_params.id),
        ..Default::default()
    };
    let res = active_model.delete(&ctx.db).await?;

    if res.rows_affected == 0 {
        return Err(anyhow!(OperationError::new(
            "can not find the rule group".to_string()
        )));
    }

    return response_ok::<Option<()>>(None);
}

#[derive(Debug, Deserialize, Serialize)]
struct RuleGroupFindParams {
    name: String,
    description: Option<String>,
}

pub async fn handle_rule_group_find(
    ctx: Arc<ServerContext>,
    req: Request<Incoming>,
) -> Result<Response<BoxBody<Bytes, Error>>> {
    let body_json: serde_json::Value = get_body_json(req.into_body()).await?;
    jsonschema::validate(&RULE_GROUP_UPDATE_PARAMS_SCHEMA, &body_json)
        .map_err(|e| anyhow!(ValidateError::new(format!("{}", e))))?;
    let body_params: RuleGroupUpdateParams = serde_json::from_value(body_json)?;

    let active_model = rule_group::ActiveModel {
        name: ActiveValue::set(body_params.name),
        description: ActiveValue::set(body_params.description),
        ..Default::default()
    };
    let res = active_model.insert(&ctx.db).await?;
    dbg!(&res);

    Ok(Response::builder()
        .header(CONTENT_TYPE, "application/json")
        .body(full(Bytes::from("{}")))?)
}
