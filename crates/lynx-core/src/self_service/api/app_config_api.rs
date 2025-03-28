use crate::entities::app_config::{self, RecordingStatus, get_app_config};
use crate::self_service::utils::{OperationError, ResponseBox, parse_body_params, response_ok};
use crate::server_context::{get_db_connect, DB};
use anyhow::{Error, Result, anyhow};
use bytes::Bytes;
use http_body_util::combinators::BoxBody;
use hyper::body::Incoming;
use hyper::{Request, Response};
use schemars::{JsonSchema, schema_for};
use sea_orm::{ActiveModelTrait, EntityTrait, IntoActiveModel, Set};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Deserialize, Serialize, JsonSchema)]
struct ChangeRecordingStatusParams {
    status: RecordingStatus,
}

pub async fn handle_recording_status(
    req: Request<Incoming>,
) -> Result<Response<BoxBody<Bytes, Error>>> {
    let db = get_db_connect();
    let add_params: ChangeRecordingStatusParams =
        parse_body_params(req.into_body(), schema_for!(ChangeRecordingStatusParams)).await?;

    let config = app_config::Entity::find().one(get_db_connect()).await?;

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

#[derive(Debug, Deserialize, Serialize, TS)]
#[ts(export)]
struct GetAppConfigResponse(ResponseBox<Option<app_config::Model>>);

pub async fn handle_app_config(_req: Request<Incoming>) -> Result<Response<BoxBody<Bytes, Error>>> {
    let config = app_config::Entity::find().one(get_db_connect()).await?;
    response_ok(config)
}

#[derive(Debug, Deserialize, Serialize, JsonSchema, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
struct SaveGeneralConfigParams {
    #[validate(range(min = 50, max = 10000))]
    max_log_size: i32,
    #[validate(range(min = 1, max = 10000))]
    clear_log_size: i32,
}

#[derive(Debug, Deserialize, Serialize, TS)]
#[ts(export)]
struct SaveGeneralConfigResponse(ResponseBox<Option<()>>);

pub async fn handle_save_general_config(
    req: Request<Incoming>,
) -> Result<Response<BoxBody<Bytes, Error>>> {
    let db = get_db_connect();
    let SaveGeneralConfigParams {
        max_log_size,
        clear_log_size,
    } = parse_body_params(req.into_body(), schema_for!(SaveGeneralConfigParams)).await?;

    let app_config = get_app_config().await;

    let mut active_model = app_config.into_active_model();
    active_model.max_log_size = Set(max_log_size);
    active_model.clear_log_size = Set(clear_log_size);
    active_model
        .save(db)
        .await
        .map_err(|e| anyhow!(e).context("save app config"))?;

    response_ok::<Option<()>>(None)
}
