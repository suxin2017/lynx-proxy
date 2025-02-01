use crate::entities::{rule, rule_group};
use crate::self_service::api::schemas::{
    RULE_GROUP_DELETE_PARAMS_SCHEMA, RULE_GROUP_UPDATE_PARAMS_SCHEMA,
};
use crate::self_service::utils::{get_body_json, response_ok, OperationError, ValidateError};
use crate::server_context::DB;
use crate::utils::full;
use anyhow::{anyhow, Error, Result};
use bytes::Bytes;
use http::header::CONTENT_TYPE;
use http_body_util::combinators::BoxBody;
use hyper::body::Incoming;
use hyper::{Request, Response};
use sea_orm::{ActiveModelTrait, ActiveValue, EntityTrait};
use serde::{Deserialize, Serialize};
use serde_json::json;

use super::schemas::RULE_GROUP_ADD_PARAMS_SCHEMA;

#[derive(Debug, Deserialize, Serialize)]
struct RuleGroupAddParams {
    name: String,
    description: Option<String>,
}

pub async fn handle_rule_group_add(
    req: Request<Incoming>,
) -> Result<Response<BoxBody<Bytes, Error>>> {
    let db = DB.get().unwrap();
    let group_add_params: serde_json::Value = get_body_json(req.into_body()).await?;
    jsonschema::validate(&RULE_GROUP_ADD_PARAMS_SCHEMA, &group_add_params)
        .map_err(|e| anyhow!(ValidateError::new(format!("{}", e))))?;
    let group_add_params: RuleGroupAddParams = serde_json::from_value(group_add_params)?;

    let active_model = rule_group::ActiveModel {
        name: ActiveValue::set(group_add_params.name),
        description: ActiveValue::set(group_add_params.description),
        ..Default::default()
    };
    let res = active_model.insert(db).await?;
    response_ok(res)
}

#[derive(Debug, Deserialize, Serialize)]
struct RuleGroupUpdateParams {
    id: i32,
    name: String,
    description: Option<String>,
}

pub async fn handle_rule_group_update(
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
    let res = active_model.update(DB.get().unwrap()).await?;
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
    let res = active_model.delete(DB.get().unwrap()).await?;

    if res.rows_affected == 0 {
        return Err(anyhow!(OperationError::new(
            "can not find the rule group".to_string()
        )));
    }

    response_ok::<Option<()>>(None)
}

#[derive(Debug, Deserialize, Serialize)]
struct RuleGroupFindParams {
    name: String,
    description: Option<String>,
}

pub async fn handle_rule_group_find(
    _req: Request<Incoming>,
) -> Result<Response<BoxBody<Bytes, Error>>> {
    let res = rule_group::Entity::find()
        .find_with_related(rule::Entity)
        .all(DB.get().unwrap())
        .await
        .map_err(|e| anyhow!(e).context("get rule group tree error"))?;

    let tree = vec_to_json_tree(res);
    return response_ok(tree);
}

fn vec_to_json_tree(rule_groups: Vec<(rule_group::Model, Vec<rule::Model>)>) -> serde_json::Value {
    let tree: Vec<serde_json::Value> = rule_groups
        .into_iter()
        .map(|(parent, children)| {
            let children_json: Vec<serde_json::Value> = children
                .into_iter()
                .map(|child| {
                    json!({
                        "title": child.name,
                        "key": format!("{}-{}", parent.id, child.id),
                        "children": [],
                        "record": serde_json::to_value(child).unwrap(),
                        "isLeaf": true
                    })
                })
                .collect();

            json!({
                "title": parent.name,
                "key": format!("{}", parent.id),
                "record": serde_json::to_value(parent).unwrap(),
                "children": children_json
            })
        })
        .collect();

    json!(tree)
}
