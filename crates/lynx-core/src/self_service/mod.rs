use crate::utils::full;
use anyhow::{Error, Result, anyhow};
use bytes::Bytes;
use http::header::CONTENT_TYPE;
use http::method;
use http_body_util::combinators::BoxBody;
use hyper::body::Incoming;
use hyper::{Request, Response};
use schemars::schema_for;
use tracing::{error, trace};
use utils::{
    OperationError, ValidateError, internal_server_error, not_found, operation_error, response_ok,
    validate_error,
};

pub mod api;
pub mod utils;

pub const SELF_SERVICE_PATH_PREFIX: &str = "/__self_service_path__";

pub const HELLO_PATH: &str = "/__self_service_path__/hello";
pub const RULE_GROUP_ADD: &str = "/__self_service_path__/rule_group/add";
pub const RULE_GROUP_UPDATE: &str = "/__self_service_path__/rule_group/update";
pub const RULE_GROUP_DELETE: &str = "/__self_service_path__/rule_group/delete";
pub const RULE_GROUP_LIST: &str = "/__self_service_path__/rule_group/list";

pub const RULE_ADD: &str = "/__self_service_path__/rule/add";
pub const RULE_UPDATE_NAME: &str = "/__self_service_path__/rule/update_name";
pub const RULE_UPDATE_CONTENT: &str = "/__self_service_path__/rule/update_content";
pub const RULE_DELETE: &str = "/__self_service_path__/rule/delete";
pub const RULE_DETAIL: &str = "/__self_service_path__/rule";

pub const REQUEST_CLEAR: &str = "/__self_service_path__/request/clear";
pub const REQUEST_LOG: &str = "/__self_service_path__/request_log";
pub const REQUEST_BODY: &str = "/__self_service_path__/request_body";

pub const RESPONSE: &str = "/__self_service_path__/response";
pub const RESPONSE_BODY: &str = "/__self_service_path__/response_body";

pub const APP_CONFIG_RECORD_STATUS: &str = "/__self_service_path__/app_config/record_status";
pub const APP_CONFIG_PATH: &str = "/__self_service_path__/app_config";

pub const CERTIFICATE_PATH: &str = "/__self_service_path__/certificate";

pub const SSL_CONFIG_SAVE: &str = "/__self_service_path__/ssl_config/save";

pub const ASSERT_DIT: &str = "/__self_service_path__/static";
pub const ASSERT_INDEX: &str = "/__self_service_path__/index.html";
pub const ASSERT_ROOT: &str = "/__self_service_path__";

pub fn match_self_service(req: &Request<Incoming>) -> bool {
    req.uri().path().starts_with(SELF_SERVICE_PATH_PREFIX)
}

pub async fn self_service_router(
    req: Request<Incoming>,
) -> Result<Response<BoxBody<Bytes, Error>>> {
    let method = req.method();
    let path = req.uri().path();

    trace!("self_service_router: method: {:?}, path: {}", method, path);

    match (method, path) {
        (&method::Method::GET, HELLO_PATH) => Ok(Response::new(full(Bytes::from("Hello, World!")))),
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
        (&method::Method::POST, RULE_UPDATE_NAME) => {
            api::rule_api::handle_rule_update_name(req).await
        }
        (&method::Method::POST, RULE_UPDATE_CONTENT) => {
            api::rule_api::handle_rule_update_content(req).await
        }
        (&method::Method::POST, RULE_DELETE) => api::rule_api::handle_rule_delete(req).await,

        (&method::Method::POST, APP_CONFIG_RECORD_STATUS) => {
            api::app_config_api::handle_recording_status(req).await
        }
        (&method::Method::GET, APP_CONFIG_PATH) => {
            api::app_config_api::handle_app_config(req).await
        }

        (&method::Method::GET, REQUEST_LOG) => api::request::handle_request_log().await,
        (&method::Method::POST, REQUEST_CLEAR) => api::request::handle_request_clear().await,
        (&method::Method::GET, REQUEST_BODY) => self::api::request::handle_request_body(req).await,

        (&method::Method::GET, RESPONSE) => self::api::response::handle_response(req).await,
        (&method::Method::GET, RESPONSE_BODY) => {
            self::api::response::handle_response_body(req).await
        }

        (&method::Method::POST, SSL_CONFIG_SAVE) => {
            self::api::ssl_config::handle_save_ssl_config(req).await
        }

        (&method::Method::GET, CERTIFICATE_PATH) => {
            self::api::certificate::handle_certificate(req).await
        }

        (&method::Method::GET, path)
            if path == SELF_SERVICE_PATH_PREFIX
                || path.starts_with(ASSERT_DIT)
                || path == ASSERT_INDEX
                || path == ASSERT_ROOT =>
        {
            self::api::assets::handle_ui_assert(req).await
        }

        _ => Ok(not_found()),
    }
}

pub async fn handle_self_service(
    req: Request<Incoming>,
) -> Result<Response<BoxBody<Bytes, Error>>> {
    let res = self_service_router(req).await;

    match res {
        Ok(res) => Ok(res),
        Err(err) => {
            error!("self_service error: {:?}", err);

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
