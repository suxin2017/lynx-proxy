use std::collections::HashMap;

use crate::config::UI_ASSERT_DIR;
use crate::entities::rule_content::RuleContent;
use crate::entities::{request, response};
use crate::proxy_log::PROXY_BOARD_CAST;
use crate::server_context::{APP_CONFIG, DB};
use crate::utils::full;
use anyhow::{anyhow, Error, Result};
use bytes::Bytes;
use futures_util::{StreamExt, TryStreamExt};
use http::header::{CACHE_CONTROL, CONTENT_TYPE};
use http::{method, HeaderValue};
use http_body_util::combinators::BoxBody;
use http_body_util::{BodyExt, StreamBody};
use hyper::body::{Frame, Incoming};
use hyper::{Request, Response};
use schemars::schema_for;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
use tokio::fs::File;
use tokio_stream::wrappers::BroadcastStream;
use tokio_util::io::ReaderStream;
use tracing::{debug, error};
use utils::{
    internal_server_error, operation_error, response_ok, validate_error, OperationError,
    ValidateError,
};

pub mod api;
pub mod utils;

const SELF_SERVICE_PATH_PREFIX: &str = "/__self_service_path__";

pub const HELLO_PATH: &str = "/__self_service_path__/hello";
pub const RULE_GROUP_ADD: &str = "/__self_service_path__/rule_group/add";
pub const RULE_GROUP_UPDATE: &str = "/__self_service_path__/rule_group/update";
pub const RULE_GROUP_DELETE: &str = "/__self_service_path__/rule_group/delete";
pub const RULE_GROUP_LIST: &str = "/__self_service_path__/rule_group/list";
pub const RULE_ADD: &str = "/__self_service_path__/rule/add";
pub const RULE_UPDATE: &str = "/__self_service_path__/rule/update";
pub const RULE_DELETE: &str = "/__self_service_path__/rule/delete";
pub const RULE_DETAIL: &str = "/__self_service_path__/rule";
pub const RULE_CONTEXT_SCHEMA: &str = "/__self_service_path__/rule/context/schema";

pub const REQUEST_LOG: &str = "/__self_service_path__/request_log";
pub const REQUEST_BODY: &str = "/__self_service_path__/request_body";
pub const RESPONSE: &str = "/__self_service_path__/response";
pub const RESPONSE_BODY: &str = "/__self_service_path__/response_body";

pub const APP_CONFIG_RECORD_STATUS: &str = "/__self_service_path__/app_config/record_status";
pub const APP_CONFIG_PATH: &str = "/__self_service_path__/app_config";

pub fn match_self_service(req: &Request<Incoming>) -> bool {
    req.uri().path().starts_with(SELF_SERVICE_PATH_PREFIX)
}

pub async fn handle_self_service(
    req: Request<Incoming>,
) -> Result<Response<BoxBody<Bytes, Error>>> {
    let method = req.method();
    let path = req.uri().path();
    debug!("handle_self_service: method: {:?}, path: {}", method, path);

    let res = match (method, path) {
        (&method::Method::GET, HELLO_PATH) => {
            return Ok(Response::new(full(Bytes::from("Hello, World!"))));
        }
        (&method::Method::GET, RULE_GROUP_LIST) => {
            api::rule_group_api::handle_rule_group_find(req).await
        }
        (&method::Method::POST, RULE_GROUP_ADD) => {
            api::rule_group_api::handle_rule_group_add(req).await
        }
        (&method::Method::POST, RULE_GROUP_UPDATE) => {
            api::rule_group_api::handle_rule_group_update(req).await
        }
        (&method::Method::POST, RULE_GROUP_DELETE) => {
            api::rule_group_api::handle_rule_group_delete(req).await
        }
        (&method::Method::GET, RULE_DETAIL) => api::rule_api::handle_rule_detail(req).await,
        (&method::Method::POST, RULE_ADD) => api::rule_api::handle_rule_add(req).await,
        (&method::Method::POST, RULE_UPDATE) => api::rule_api::handle_rule_update(req).await,
        (&method::Method::POST, RULE_DELETE) => api::rule_api::handle_rule_delete(req).await,
        (&method::Method::POST, APP_CONFIG_RECORD_STATUS) => {
            api::app_config_api::handle_recording_status(req).await
        }
        (&method::Method::GET, APP_CONFIG_PATH) => {
            api::app_config_api::handle_app_config(req).await
        }
        (&method::Method::GET, RULE_CONTEXT_SCHEMA) => {
            let schema = schema_for!(RuleContent);
            let schema = serde_json::to_value(&schema).map_err(|e| anyhow!(e))?;
            return response_ok(schema);
        }
        (&method::Method::GET, REQUEST_LOG) => {
            let rx = PROXY_BOARD_CAST.subscribe();
            let rx_stream = BroadcastStream::new(rx)
                .then(|result| async {
                    match result {
                        Ok(d) => match serde_json::to_string(&d) {
                            Ok(json_str) => Ok(Frame::data(Bytes::from(json_str))),
                            Err(e) => {
                                error!("serialization error: {:?}", e);
                                Err(anyhow!(e))
                            }
                        },
                        Err(e) => {
                            error!("broadcast stream error: {:?}", e);
                            Err(anyhow!(e))
                        }
                    }
                })
                .map_err(|e| {
                    error!("broadcast stream error: {:?}", e);
                    anyhow!(e)
                });

            let body = BodyExt::boxed(StreamBody::new(rx_stream));

            let mut res = Response::new(body);
            res.headers_mut().insert(
                CONTENT_TYPE,
                HeaderValue::from_static("application/x-ndjson; charset=UTF-8"),
            );
            res.headers_mut()
                .insert(CACHE_CONTROL, HeaderValue::from_static("no-cache"));

            // set cors headers when development
            #[cfg(feature = "test")]
            {
                res.headers_mut()
                    .insert("Access-Control-Allow-Origin", HeaderValue::from_static("*"));
                res.headers_mut().insert(
                    "Access-Control-Allow-Methods",
                    HeaderValue::from_static("GET, POST, OPTIONS"),
                );
                res.headers_mut().insert(
                    "Access-Control-Allow-Headers",
                    HeaderValue::from_static("Content-Type"),
                );
            }

            return Ok(res);
        }
        (&method::Method::GET, RESPONSE) => {
            let params: HashMap<String, String> = req
                .uri()
                .query()
                .map(|v| {
                    url::form_urlencoded::parse(v.as_bytes())
                        .into_owned()
                        .collect()
                })
                .unwrap_or_default();
            let request_id = params.get("requestId");
            if request_id.is_none() {
                return Err(anyhow!(ValidateError::new(
                    "requestId is required".to_string()
                )));
            }

            let response = response::Entity::find()
                .filter(response::Column::RequestId.eq(request_id.unwrap()))
                .one(DB.get().unwrap())
                .await?;
            if response.is_none() {
                return Err(anyhow!(OperationError::new(
                    "response not found".to_string()
                )));
            }
            let response = response.unwrap();
            return response_ok(response);
        }
        (&method::Method::GET, RESPONSE_BODY) => {
            let params: HashMap<String, String> = req
                .uri()
                .query()
                .map(|v| {
                    url::form_urlencoded::parse(v.as_bytes())
                        .into_owned()
                        .collect()
                })
                .unwrap_or_default();
            let request_id = params.get("requestId");
            if request_id.is_none() {
                return Err(anyhow!(ValidateError::new(
                    "requestId is required".to_string()
                )));
            }

            let response = response::Entity::find()
                .filter(response::Column::RequestId.eq(request_id.unwrap()))
                .one(DB.get().unwrap())
                .await?;
            if response.is_none() {
                return Err(anyhow!(OperationError::new(
                    "response not found".to_string()
                )));
            }
            let response = response.unwrap();

            let assert_root = &APP_CONFIG.get().unwrap().raw_root_dir;
            let filename = assert_root.join(format!("{}/res", response.trace_id));
            let file = File::open(filename).await;
            if file.is_err() {
                eprintln!("ERROR: Unable to open file.");
            }
            let file = file?;
            let reader_stream = ReaderStream::new(file);
            let stream_body = StreamBody::new(
                reader_stream
                    .map_ok(Frame::data)
                    .map_err(|e| anyhow!(e).context("response body stream error")),
            );
            let boxed_body = BodyExt::boxed(stream_body);
            return Ok(Response::builder()
                .header(
                    CONTENT_TYPE,
                    HeaderValue::from_static("application/octet-stream"),
                )
                .body(boxed_body)?);
        }
        (&method::Method::GET, REQUEST_BODY) => {
            let params: HashMap<String, String> = req
                .uri()
                .query()
                .map(|v| {
                    url::form_urlencoded::parse(v.as_bytes())
                        .into_owned()
                        .collect()
                })
                .unwrap_or_default();
            let id = params.get("id");
            if id.is_none() {
                return Err(anyhow!(ValidateError::new(
                    "requestId is required".to_string()
                )));
            }
            let id = id.unwrap().parse::<i32>().map_err(|e| anyhow!(e))?;

            let request = request::Entity::find_by_id(id)
                .one(DB.get().unwrap())
                .await?;
            if request.is_none() {
                return Err(anyhow!(OperationError::new(
                    "response not found".to_string()
                )));
            }
            let request = request.unwrap();

            let assert_root = &APP_CONFIG.get().unwrap().raw_root_dir;
            let filename = assert_root.join(format!("{}/req", request.trace_id));
            let file = File::open(filename).await;
            if file.is_err() {
                eprintln!("ERROR: Unable to open file.");
            }
            let file = file?;
            let reader_stream = ReaderStream::new(file);
            let stream_body = StreamBody::new(
                reader_stream
                    .map_ok(Frame::data)
                    .map_err(|e| anyhow!(e).context("response body stream error")),
            );
            let boxed_body = BodyExt::boxed(stream_body);
            return Ok(Response::builder()
                .header(
                    CONTENT_TYPE,
                    HeaderValue::from_static("application/octet-stream"),
                )
                .body(boxed_body)?);
        }
        (&method::Method::GET, path) if path.starts_with(SELF_SERVICE_PATH_PREFIX) => {
            let mut static_path = &path[SELF_SERVICE_PATH_PREFIX.len()..];
            if static_path.starts_with("/") {
                static_path = &static_path[1..];
            }

            if matches!(static_path, "/" | "") {
                static_path = "index.html";
            }

            println!("static path {}", &static_path);

            let static_file = UI_ASSERT_DIR.get_file(static_path);
            let mime_type = mime_guess::from_path(&static_path);
            let content_type = mime_type
                .first()
                .and_then(|mime| {
                    let mime_str = mime.to_string();
                    HeaderValue::from_str(&mime_str).ok()
                })
                .unwrap_or_else(|| HeaderValue::from_static("text/html"));

            let static_file = static_file;
            if static_file.is_none() {
                return Err(anyhow!(OperationError::new("file not found".to_string())));
            }
            let static_file = static_file.unwrap();

            let bytes = Bytes::from_static(static_file.contents());

            let body = BoxBody::boxed(full(bytes));

            let res = Response::builder()
                .header(CONTENT_TYPE, content_type)
                .body(body)
                .unwrap();
            return Ok(res);
        }

        _ => {
            let res = Response::builder()
                .status(http::status::StatusCode::NOT_FOUND)
                .header(CONTENT_TYPE, "text/plain")
                .body(full(Bytes::from("Not Found")))
                .unwrap();
            return Ok(res);
        }
    };

    match res {
        Ok(res) => Ok(res),
        Err(err) => {
            let res = if err.downcast_ref::<ValidateError>().is_some() {
                let err_string = format!("{}", err);
                validate_error(err_string)
            } else if err.downcast_ref::<OperationError>().is_some() {
                operation_error(err.to_string())
            } else {
                internal_server_error(err.to_string())
            };

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
