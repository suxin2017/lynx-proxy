use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

use anyhow::{anyhow, Error, Result};
use bytes::{Buf, Bytes};
use http::header::CONTENT_TYPE;
use http::method;
use http_body_util::combinators::BoxBody;
use http_body_util::BodyExt;
use hyper::body::{self, Incoming};
use hyper::{Request, Response};
use sea_orm::{ActiveModelBehavior, ActiveValue, DatabaseConnection, EntityTrait};
use tokio::sync::broadcast;
use tracing::error;
use utils::{
    internal_server_error, operation_error, validate_error, OperationError, ValidateError,
};

use crate::entities::prelude::Rule;
use crate::entities::rule;
use crate::server_context::ServerContext;
use crate::utils::full;

pub mod api;
pub mod rule_group;
pub mod utils;

const SELF_SERVICE_PATH_PREFIX: &str = "/__self_service_path__";

pub const HELLO_PATH: &str = "/__self_service_path__/hello";
pub const RULE_GROUP_ADD: &str = "/__self_service_path__/rule_group/add";
pub const RULE_GROUP_UPDATE: &str = "/__self_service_path__/rule_group/update";
pub const RULE_GROUP_DELETE: &str = "/__self_service_path__/rule_group/delete";
pub const RULE_GROUP_LIST: &str = "/__self_service_path__/rule_group/list";

pub fn match_self_service(req: &Request<Incoming>) -> bool {
    req.uri().path().starts_with(SELF_SERVICE_PATH_PREFIX)
}

type Body = BoxBody<Bytes, Error>;

pub async fn handle_self_service(
    proxy_receivers: Arc<broadcast::Receiver<String>>,
    ctx: Arc<ServerContext>,
    req: Request<Incoming>,
) -> Result<Response<BoxBody<Bytes, Error>>> {
    tokio::spawn(async move {
        let mut rc = proxy_receivers.resubscribe();
        loop {
            let data = rc.recv().await;
            dbg!(&data);
        }
    });
    let method = req.method();
    let path = req.uri().path();

    let res = match (method, path) {
        (&method::Method::GET, HELLO_PATH) => {
            return Ok(Response::new(full(Bytes::from("Hello, World!"))));
        }
        (&method::Method::POST, RULE_GROUP_ADD) => {
            api::rule_group_api::handle_rule_group_add(ctx, req).await
        }
        (&method::Method::POST, RULE_GROUP_UPDATE) => {
            api::rule_group_api::handle_rule_group_update(ctx, req).await
        }
        (&method::Method::POST, RULE_GROUP_DELETE) => {
            api::rule_group_api::handle_rule_group_delete(ctx, req).await
        }
        (&method::Method::POST, RULE_GROUP_LIST) => {
            api::rule_group_api::handle_rule_group_find(ctx, req).await
        }

        _ => {
            let res = Response::builder()
                .status(http::status::StatusCode::NOT_FOUND)
                .body(full(Bytes::from("Not Found")))
                .unwrap();
            return Ok(res);
        }
    };

    match res {
        Ok(res) => Ok(res),
        Err(err) => {
            let res = if matches!(err.downcast_ref::<ValidateError>(), Some(_)) {
                let err_string = err.to_string();
                let first_error_messge = err_string.split("\n").next().unwrap_or_default();
                let first_error_messge = first_error_messge.split(": ").last().unwrap_or_default();
                dbg!(&first_error_messge);
                validate_error(first_error_messge.to_string())
            } else if matches!(err.downcast_ref::<OperationError>(), Some(_)) {
                operation_error(err.to_string())
            } else {
                internal_server_error(err.to_string())
            };

            dbg!(&res);

            let json_str = serde_json::to_string(&res)
                .map_err(|e| anyhow!(e).context("response box to json error"))?;

            let data = json_str.into_bytes();

            let res = Response::builder()
                .header(CONTENT_TYPE, "application/json")
                .body(full(data))
                .unwrap();
            Ok(res)
        }
    }
}
