use anyhow::{Error, Result};
use http_body_util::combinators::BoxBody;
use hyper::body::{Bytes, Incoming};
use hyper::{Request, Response};
use sea_orm::ActiveModelTrait;
use tracing::{info, trace};

use crate::entities::rule::capture::CaptureType;
use crate::plugins::http_request_plugin::{self, build_proxy_response};
use crate::proxy_log::{
    create_request_active_model_by_req, try_send_req_message,
};
use crate::schedular::get_req_trace_id;
use crate::self_service::model::rule_content::get_all_rule_content;

pub async fn handle_capture_req(mut req: Request<Incoming>) -> Result<Request<Incoming>> {
    let all_rule_content = get_all_rule_content().await?;

    let handlers = all_rule_content
        .into_iter()
        .filter(|rule_content| {
            rule_content
                .capture
                .as_ref()
                .map(|capture| match capture.r#type {
                    CaptureType::Glob => {
                        let req_url = url::Url::parse(&req.uri().to_string()).unwrap();
                        let is_match = glob_match::glob_match(&capture.url, req_url.as_str());
                        is_match
                    }
                    CaptureType::Regex => {
                        let req_url = req.uri().to_string();
                        let is_match = regex::Regex::new(&capture.url).unwrap().is_match(&req_url);
                        trace!("is match: {}", is_match);
                        is_match
                    }
                })
                .unwrap_or(false)
        })
        .flat_map(|rule_content| rule_content.handlers)
        .collect::<Vec<_>>();
    req.extensions_mut().insert(handlers);
    Ok(req)
}

pub async fn proxy_http_request(req: Request<Incoming>) -> Result<Response<BoxBody<Bytes, Error>>> {
    let req = handle_capture_req(req).await?;
    let request_active_model = create_request_active_model_by_req(&req);

    info!("proxying http request {:?}", req);
    let trace_id = get_req_trace_id(&req);

    let response = http_request_plugin::request(req).await;

    match response {
        Ok(proxy_res) => {
            try_send_req_message(request_active_model, Some(&proxy_res)).await?;
            return build_proxy_response(trace_id, proxy_res).await;
        }
        Err(e) => {
            try_send_req_message(request_active_model, None).await?;
            trace!("proxy http request error: {:?}", e);
            return Err(e);
        }
    }
}
