use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

use anyhow::{Error, Result};
use bytes::{Buf, Bytes};
use http::header::CONTENT_TYPE;
use http::method;
use http_body_util::combinators::BoxBody;
use http_body_util::BodyExt;
use hyper::body::{self, Incoming};
use hyper::{Request, Response};
use sea_orm::{ActiveModelBehavior, ActiveValue, DatabaseConnection, EntityTrait};
use serde::{Deserialize, Serialize};
use validator::Validate;

use crate::entities::prelude::Rule;
use crate::entities::rule;
use crate::self_service::utils::{get_body_json, validate_error};
use crate::server_context::ServerContext;
use crate::utils::full;

#[derive(Debug, Validate, Deserialize, Serialize)]
struct RuleGroupAddParams {
    name: String,
    #[validate(required(message = "description is required"))]
    description: Option<String>,
}

pub async fn handle_rule_group_add(
    ctx: Arc<ServerContext>,
    req: Request<Incoming>,
) -> Result<Response<BoxBody<Bytes, Error>>> {
    let group_add_params: RuleGroupAddParams = get_body_json(req.into_body()).await?;

    match group_add_params.validate() {
        Ok(_) => {}
        Err(e) => {
            dbg!(e);
        }
    }

    Ok(Response::builder()
        .header(CONTENT_TYPE, "application/json")
        .body(full(Bytes::from("{}")))?)
}
