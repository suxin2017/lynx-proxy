use anyhow::{Error, Result};
use http_body_util::combinators::BoxBody;
use hyper::body::{Bytes, Incoming};
use hyper::{Request, Response};
use sea_orm::{ActiveModelTrait, Set};
use tracing::{debug, info, trace};

use crate::entities::app_config::{get_app_config, RecordingStatus};
use crate::entities::request::{self};
use crate::entities::response;
use crate::plugins::http_request_plugin::{self, build_proxy_response};
use crate::proxy_log::message::Message;
use crate::proxy_log::try_send_message;
use crate::schedular::get_req_trace_id;
use crate::server_context::DB;

pub async fn proxy_http_request(req: Request<Incoming>) -> Result<Response<BoxBody<Bytes, Error>>> {
    info!("proxying http request {:?}", req);
    let trace_id = get_req_trace_id(&req);

    let headers = req
        .headers()
        .iter()
        .map(|(k, v)| (k.as_str().to_string(), v.to_str().unwrap_or("").to_string()))
        .collect();
    let header_size: usize = req
        .headers()
        .iter()
        .map(|(k, v)| k.as_str().len() + v.as_bytes().len())
        .sum();

    let mut request_active_model = request::ActiveModel {
        trace_id: Set(trace_id.to_string()),
        uri: Set(req.uri().to_string()),
        method: Set(req.method().to_string()),
        schema: Set(req.uri().scheme_str().unwrap_or("").to_string()),
        version: Set(format!("{:?}", req.version())),
        header: Set(headers),
        header_size: Set(header_size as u32),
        ..Default::default()
    };

    match http_request_plugin::request(req).await {
        Ok(proxy_res) => {
            trace!("origin response: {:?}", proxy_res);
            request_active_model.set(
                request::Column::StatusCode,
                proxy_res.status().as_u16().into(),
            );
            let app_config = get_app_config().await;
            debug!("recording status: {:?}", app_config.recording_status);  
            if matches!(app_config.recording_status, RecordingStatus::StartRecording) {
                let record = request_active_model.insert(DB.get().unwrap()).await?;
                let request_id = record.id;
                try_send_message(Message::add(record));
                let header_size: usize = proxy_res
                    .headers()
                    .iter()
                    .map(|(k, v)| k.as_str().len() + v.as_bytes().len())
                    .sum();

                let response = response::ActiveModel {
                    request_id: Set(request_id),
                    trace_id: Set(trace_id.to_string()),
                    header: Set(proxy_res
                        .headers()
                        .iter()
                        .map(|(k, v)| {
                            (k.as_str().to_string(), v.to_str().unwrap_or("").to_string())
                        })
                        .collect()),
                    header_size: Set(header_size as u32),
                    ..Default::default()
                };

                response.insert(DB.get().unwrap()).await?;
            }

            build_proxy_response(trace_id, proxy_res).await
        }
        Err(e) => {
            let app_config = get_app_config().await;

            if matches!(app_config.recording_status, RecordingStatus::StartRecording) {
                let record = request_active_model.insert(DB.get().unwrap()).await?;
                try_send_message(Message::add(record));
            }
            Err(e)
        }
    }
}
