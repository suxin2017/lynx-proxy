use crate::utils::full;
use anyhow::{Error, Result, anyhow};
use bytes::Bytes;
use http::header::CONTENT_TYPE;
use http::method;
use http_body_util::combinators::BoxBody;
use hyper::body::Incoming;
use hyper::{Request, Response};
use tracing::{error, trace};
use utils::{
    OperationError, ValidateError, internal_server_error, not_found, operation_error,
    validate_error,
};

pub mod api;
pub mod model;
pub mod paths;
pub mod utils;

use paths::SelfServiceRouterPath;

pub const SELF_SERVICE_PATH_PREFIX: &str = "/__self_service_path__";

pub fn is_self_service(req: &Request<Incoming>) -> bool {
    req.uri().path().starts_with(SELF_SERVICE_PATH_PREFIX)
}

pub async fn self_service_router(
    req: Request<Incoming>,
) -> Result<Response<BoxBody<Bytes, Error>>> {
    let method = req.method();
    let path = req.uri().path();

    trace!("self_service_router: method: {:?}, path: {}", method, path);

    match (method, SelfServiceRouterPath::from(path)) {
        (&method::Method::GET, SelfServiceRouterPath::Hello) => {
            Ok(Response::new(full(Bytes::from("Hello, World!"))))
        }
        (&method::Method::GET, SelfServiceRouterPath::RuleGroupList) => {
            api::rule_group_api::handle_rule_group_find(req).await
        }
        (&method::Method::POST, SelfServiceRouterPath::RuleGroupAdd) => {
            api::rule_group_api::handle_rule_group_add(req).await
        }
        (&method::Method::POST, SelfServiceRouterPath::RuleGroupUpdate) => {
            api::rule_group_api::handle_rule_group_update(req).await
        }
        (&method::Method::POST, SelfServiceRouterPath::RuleGroupDelete) => {
            api::rule_group_api::handle_rule_group_delete(req).await
        }

        (&method::Method::GET, SelfServiceRouterPath::RuleDetail) => {
            api::rule_api::handle_rule_detail(req).await
        }
        (&method::Method::POST, SelfServiceRouterPath::RuleAdd) => {
            api::rule_api::handle_add_rule(req).await
        }
        (&method::Method::POST, SelfServiceRouterPath::RuleUpdateName) => {
            api::rule_api::handle_update_rule_name(req).await
        }
        (&method::Method::POST, SelfServiceRouterPath::RuleUpdateContent) => {
            api::rule_api::handle_update_rule_content(req).await
        }
        (&method::Method::POST, SelfServiceRouterPath::RuleDelete) => {
            api::rule_api::handle_delete_rule(req).await
        }

        (&method::Method::POST, SelfServiceRouterPath::AppConfigRecordStatus) => {
            api::app_config_api::handle_recording_status(req).await
        }
        (&method::Method::GET, SelfServiceRouterPath::AppConfigPath) => {
            api::app_config_api::handle_app_config(req).await
        }

        (&method::Method::GET, SelfServiceRouterPath::RequestLog) => {
            api::request::handle_request_log().await
        }
        (&method::Method::POST, SelfServiceRouterPath::RequestClear) => {
            api::request::handle_request_clear().await
        }
        (&method::Method::GET, SelfServiceRouterPath::RequestBody) => {
            self::api::request::handle_request_body(req).await
        }

        (&method::Method::GET, SelfServiceRouterPath::Response) => {
            self::api::response::handle_response(req).await
        }
        (&method::Method::GET, SelfServiceRouterPath::ResponseBody) => {
            self::api::response::handle_response_body(req).await
        }

        (&method::Method::POST, SelfServiceRouterPath::SslConfigSave) => {
            self::api::ssl_config::handle_save_ssl_config(req).await
        }
        (&method::Method::POST, SelfServiceRouterPath::GeneralConfigSave) => {
            self::api::app_config_api::handle_save_general_config(req).await
        }

        (&method::Method::GET, SelfServiceRouterPath::CertificatePath) => {
            self::api::certificate::handle_certificate(req).await
        }

        (&method::Method::GET, _)
            if path.starts_with(&SelfServiceRouterPath::AssertDit.to_string())
                || path == SelfServiceRouterPath::AssertIndex.to_string()
                || path == SelfServiceRouterPath::AssertRoot.to_string() =>
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
