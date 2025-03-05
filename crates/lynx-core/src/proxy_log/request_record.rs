use std::sync::Arc;

use http::Request;
use hyper::body::Incoming;
use serde::{Deserialize, Serialize};

use crate::schedular::get_req_trace_id;

#[derive(Default, Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RequestRecord {
    pub trace_id: Arc<String>,
    pub method: Option<String>,
    pub uri: Option<String>,
    pub host: Option<String>,
    pub schema: Option<String>,
    pub start: Option<i64>,
    pub end: Option<i64>,
    pub size: Option<u128>,
    pub code: Option<u16>,
}

impl From<&Request<Incoming>> for RequestRecord {
    fn from(req: &Request<Incoming>) -> Self {
        let id = get_req_trace_id(req);
        let uri = req.uri();
        let method = Some(req.method().to_string());
        let host = uri.host().map(|host| host.to_string());
        let schema = uri.scheme_str().map(|schema| schema.to_string());
        let start = Some(chrono::Utc::now().timestamp_millis());
        let uri = Some(uri.to_string());
        RequestRecord {
            trace_id: id,
            code: None,
            method,
            uri,
            host,
            schema,
            start,
            end: None,
            size: None,
        }
    }
}
