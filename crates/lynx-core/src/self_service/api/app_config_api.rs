use crate::entities::app_config::{self, RecordingStatus};
use crate::self_service::utils::{parse_body_params, response_ok, OperationError};
use crate::server_context::DB;
use anyhow::{anyhow, Error, Result};
use bytes::Bytes;
use http_body_util::combinators::BoxBody;
use hyper::body::Incoming;
use hyper::{Request, Response};
use schemars::{schema_for, JsonSchema};
use sea_orm::{ActiveModelTrait, EntityTrait, IntoActiveModel, Set};
use serde::{Deserialize, Serialize};


#[derive(Debug, Deserialize, Serialize, JsonSchema)]
struct ChangeRecordingStatusParams {
    status: RecordingStatus,
}

pub async fn handle_recording_status(
    req: Request<Incoming>,
) -> Result<Response<BoxBody<Bytes, Error>>> {
    let db = DB.get().unwrap();
    let add_params: ChangeRecordingStatusParams =
        parse_body_params(req.into_body(), schema_for!(ChangeRecordingStatusParams)).await?;

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
