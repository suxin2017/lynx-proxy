use anyhow::{Error, Result};
use http_body_util::combinators::BoxBody;
use hyper::body::{Bytes, Incoming};
use hyper::{Request, Response};
use tracing::{info, trace};

use crate::entities::request;
use crate::plugins::http_request_plugin::{self, build_proxy_response};
use crate::proxy_log::message::Message;
use crate::proxy_log::request_record::RequestRecord;
use crate::proxy_log::try_send_message;
use crate::schedular::get_req_trace_id;

pub async fn proxy_http_request(req: Request<Incoming>) -> Result<Response<BoxBody<Bytes, Error>>> {
    info!("proxying http request {:?}", req);
    let trace_id = get_req_trace_id(&req);
    let mut request_model_builder = request::ModelBuilder::default();
    request_model_builder
        .uri(req.uri().to_string())
        .trace_id(trace_id.to_string())
        .method(req.method().to_string())
        .schema(req.uri().scheme_str().unwrap_or("").to_string())
        .version(format!("{:?}", req.version()))
        .header(
            req.headers()
                .iter()
                .map(|(k, v)| (k.as_str().to_string(), v.to_str().unwrap_or("").to_string()))
                .collect(),
        );

    match http_request_plugin::request(req).await {
        Ok(proxy_res) => {
            trace!("origin response: {:?}", proxy_res);
            request_model_builder.status_code(proxy_res.status().as_u16());
            if let Ok(request_record) = request_model_builder.build() {
                try_send_message(Message::add(request_record));
            }

            build_proxy_response(trace_id, proxy_res).await
        }
        Err(e) => {
            if let Ok(request_record) = request_model_builder.build() {
                try_send_message(Message::add(request_record));
            }
            Err(e)
        }
    }
}
