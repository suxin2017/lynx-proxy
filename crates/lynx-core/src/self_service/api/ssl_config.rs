use crate::entities::app_config::{SSLConfig, SSLConfigRule, get_app_config};
use crate::self_service::utils::{parse_body_params, response_ok};
use crate::server_context::get_db_connect;
use anyhow::{Error, Result, anyhow};
use bytes::Bytes;
use http_body_util::combinators::BoxBody;
use hyper::body::Incoming;
use hyper::{Request, Response};
use schemars::{JsonSchema, schema_for};
use sea_orm::{ActiveModelTrait, IntoActiveModel, Set};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
struct SaveSSLConfigParams {
    #[serde(rename = "captureSSL")]
    capture_ssl: bool,
    include_domains: Vec<SSLConfigRule>,
    exclude_domains: Vec<SSLConfigRule>,
}

pub async fn handle_save_ssl_config(
    req: Request<Incoming>,
) -> Result<Response<BoxBody<Bytes, Error>>> {
    let db = get_db_connect();
    let SaveSSLConfigParams {
        capture_ssl,
        include_domains,
        exclude_domains,
    } = parse_body_params(req.into_body(), schema_for!(SaveSSLConfigParams)).await?;

    let app_config = get_app_config().await;

    let mut active_model = app_config.into_active_model();
    active_model.capture_ssl = Set(capture_ssl);
    active_model.ssl_config = Set(Some(
        serde_json::to_value(SSLConfig {
            include_domains,
            exclude_domains,
        })
        .map_err(|e| anyhow!(e))?,
    ));

    active_model
        .save(db)
        .await
        .map_err(|e| anyhow!(e).context("save app config"))?;

    response_ok::<Option<()>>(None)
}
