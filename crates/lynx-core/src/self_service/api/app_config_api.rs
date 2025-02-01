use crate::entities::app_config::{self, RecordingStatus};
use crate::entities::{rule, rule_content, rule_group};
use crate::self_service::api::schemas::{
    RULE_GROUP_DELETE_PARAMS_SCHEMA, RULE_GROUP_UPDATE_PARAMS_SCHEMA, RULE_UPDATE_PARAMS_SCHEMA,
};
use crate::self_service::utils::{
    get_body_json, get_query_params, response_ok, OperationError, ValidateError,
};
use crate::server_context::{APP_CONFIG, DB};
use crate::utils::full;
use anyhow::{anyhow, Error, Result};
use bytes::Bytes;
use http::header::CONTENT_TYPE;
use http_body_util::combinators::BoxBody;
use hyper::body::Incoming;
use hyper::{Request, Response};
use sea_orm::{
    ActiveModelTrait, ActiveValue, ColumnTrait, Condition, EntityTrait, IntoActiveModel,
    ModelTrait, QueryFilter, Set,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tracing::span::Record;

use super::schemas::{
    CHANGE_RECORDING_STATUS_PARAM_SCHEMA, RULE_ADD_PARAMS_SCHEMA, RULE_DELETE_PARAMS_SCHEMA,
    RULE_GROUP_ADD_PARAMS_SCHEMA,
};

#[derive(Debug, Deserialize, Serialize)]
struct ChangeRecordingStatusParams {
    status: RecordingStatus,
}

pub async fn handle_recording_status(
    req: Request<Incoming>,
) -> Result<Response<BoxBody<Bytes, Error>>> {
    let db = DB.get().unwrap();
    let add_params: serde_json::Value = get_body_json(req.into_body()).await?;
    jsonschema::validate(&CHANGE_RECORDING_STATUS_PARAM_SCHEMA, &add_params)
        .map_err(|e| anyhow!(ValidateError::new(format!("{}", e))))?;
    let add_params: ChangeRecordingStatusParams = serde_json::from_value(add_params)?;

    let config = app_config::Entity::find().one(DB.get().unwrap()).await?;

    if let Some(config) = config {
        let mut config_active = config.into_active_model();
        println!("add_params.status: {:?}", add_params.status);
        config_active.recording_status = Set(add_params.status);

        let res = config_active.update(db).await?;
        println!("res: {:?}", res);

        response_ok::<Option<()>>(None)
    } else {
        Err(anyhow!(OperationError::new("config not found".to_owned())))
    }
}

pub async fn handle_app_config(_req: Request<Incoming>) -> Result<Response<BoxBody<Bytes, Error>>> {
    let config = app_config::Entity::find().one(DB.get().unwrap()).await?;
    response_ok(config)
}
