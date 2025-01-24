
use anyhow::{Error, Result};
use http_body_util::combinators::BoxBody;
use hyper::body::{Bytes, Incoming};
use hyper::{Request, Response};
use tracing::{info, trace};

use crate::plugins::http_request_plugin::{self, build_proxy_response};
use crate::proxy_log::message::{Message};
use crate::proxy_log::request_record::RequestRecord;
use crate::proxy_log::try_send_message;
use crate::schedular::get_req_trace_id;

pub async fn proxy_http_request(req: Request<Incoming>) -> Result<Response<BoxBody<Bytes, Error>>> {
    info!("proxying http request {:?}", req);
    let mut request_record = RequestRecord::from(&req);

    let trace_id = get_req_trace_id(&req);

    match http_request_plugin::request(req).await {
        Ok(proxy_res) => {
            trace!("origin response: {:?}", proxy_res);
            request_record.end = Some(chrono::Utc::now().timestamp_millis());
            request_record.code = Some(proxy_res.status().as_u16());

            try_send_message(Message::Add(request_record));
            build_proxy_response(trace_id, proxy_res).await
        }
        Err(e) => {
            request_record.end = Some(chrono::Utc::now().timestamp_millis());
            try_send_message(Message::Add(request_record));

            Err(e)
        }
    }
}
