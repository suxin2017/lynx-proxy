use std::fmt;

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

// TODO: add macro support

pub enum SelfServiceRouterPath {
    Hello,
    RuleGroupAdd,
    RuleGroupUpdate,
    RuleGroupDelete,
    RuleGroupList,
    RuleAdd,
    RuleUpdateName,
    RuleUpdateContent,
    RuleDelete,
    RuleDetail,
    RequestClear,
    RequestLog,
    RequestBody,
    Response,
    ResponseBody,
    AppConfigRecordStatus,
    AppConfigPath,
    CertificatePath,
    SslConfigSave,
    AssertDit,
    AssertIndex,
    AssertRoot,
    RuleContextSchema, // Add this line
}

impl From<&str> for SelfServiceRouterPath {
    fn from(value: &str) -> Self {
        match value {
            "/__self_service_path__/hello" => SelfServiceRouterPath::Hello,
            "/__self_service_path__/rule_group/add" => SelfServiceRouterPath::RuleGroupAdd,
            "/__self_service_path__/rule_group/update" => SelfServiceRouterPath::RuleGroupUpdate,
            "/__self_service_path__/rule_group/delete" => SelfServiceRouterPath::RuleGroupDelete,
            "/__self_service_path__/rule_group/list" => SelfServiceRouterPath::RuleGroupList,
            "/__self_service_path__/rule/add" => SelfServiceRouterPath::RuleAdd,
            "/__self_service_path__/rule/update_name" => SelfServiceRouterPath::RuleUpdateName,
            "/__self_service_path__/rule/update_content" => {
                SelfServiceRouterPath::RuleUpdateContent
            }
            "/__self_service_path__/rule/delete" => SelfServiceRouterPath::RuleDelete,
            "/__self_service_path__/rule" => SelfServiceRouterPath::RuleDetail,
            "/__self_service_path__/request/clear" => SelfServiceRouterPath::RequestClear,
            "/__self_service_path__/request_log" => SelfServiceRouterPath::RequestLog,
            "/__self_service_path__/request_body" => SelfServiceRouterPath::RequestBody,
            "/__self_service_path__/response" => SelfServiceRouterPath::Response,
            "/__self_service_path__/response_body" => SelfServiceRouterPath::ResponseBody,
            "/__self_service_path__/app_config/record_status" => {
                SelfServiceRouterPath::AppConfigRecordStatus
            }
            "/__self_service_path__/app_config" => SelfServiceRouterPath::AppConfigPath,
            "/__self_service_path__/certificate" => SelfServiceRouterPath::CertificatePath,
            "/__self_service_path__/ssl_config/save" => SelfServiceRouterPath::SslConfigSave,
            "/__self_service_path__/static" => SelfServiceRouterPath::AssertDit,
            "/__self_service_path__/index.html" => SelfServiceRouterPath::AssertIndex,
            "/__self_service_path__" => SelfServiceRouterPath::AssertRoot,
            "/__self_service_path__/rule/context/schema" => SelfServiceRouterPath::RuleContextSchema, // Add this line
            _ => panic!("Invalid path: {}", value),
        }
    }
}

impl fmt::Display for SelfServiceRouterPath {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            SelfServiceRouterPath::Hello => write!(f, "/__self_service_path__/hello"),
            SelfServiceRouterPath::RuleGroupAdd => {
                write!(f, "/__self_service_path__/rule_group/add")
            }
            SelfServiceRouterPath::RuleGroupUpdate => {
                write!(f, "/__self_service_path__/rule_group/update")
            }
            SelfServiceRouterPath::RuleGroupDelete => {
                write!(f, "/__self_service_path__/rule_group/delete")
            }
            SelfServiceRouterPath::RuleGroupList => {
                write!(f, "/__self_service_path__/rule_group/list")
            }
            SelfServiceRouterPath::RuleAdd => write!(f, "/__self_service_path__/rule/add"),
            SelfServiceRouterPath::RuleUpdateName => {
                write!(f, "/__self_service_path__/rule/update_name")
            }
            SelfServiceRouterPath::RuleUpdateContent => {
                write!(f, "/__self_service_path__/rule/update_content")
            }
            SelfServiceRouterPath::RuleDelete => write!(f, "/__self_service_path__/rule/delete"),
            SelfServiceRouterPath::RuleDetail => write!(f, "/__self_service_path__/rule"),
            SelfServiceRouterPath::RequestClear => {
                write!(f, "/__self_service_path__/request/clear")
            }
            SelfServiceRouterPath::RequestLog => write!(f, "/__self_service_path__/request_log"),
            SelfServiceRouterPath::RequestBody => write!(f, "/__self_service_path__/request_body"),
            SelfServiceRouterPath::Response => write!(f, "/__self_service_path__/response"),
            SelfServiceRouterPath::ResponseBody => {
                write!(f, "/__self_service_path__/response_body")
            }
            SelfServiceRouterPath::AppConfigRecordStatus => {
                write!(f, "/__self_service_path__/app_config/record_status")
            }
            SelfServiceRouterPath::AppConfigPath => write!(f, "/__self_service_path__/app_config"),
            SelfServiceRouterPath::CertificatePath => {
                write!(f, "/__self_service_path__/certificate")
            }
            SelfServiceRouterPath::SslConfigSave => {
                write!(f, "/__self_service_path__/ssl_config/save")
            }
            SelfServiceRouterPath::AssertDit => write!(f, "/__self_service_path__/static"),
            SelfServiceRouterPath::AssertIndex => write!(f, "/__self_service_path__/index.html"),
            SelfServiceRouterPath::AssertRoot => write!(f, "/__self_service_path__"),
            SelfServiceRouterPath::RuleContextSchema => write!(f, "/__self_service_path__/rule/context/schema"), // Add this line
        }
    }
}
