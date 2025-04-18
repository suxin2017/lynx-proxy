use std::sync::Arc;

use anyhow::{Ok, Result};
use once_cell::sync::Lazy;
use tokio::sync::broadcast;
use tracing::{debug, error};

use crate::{
    entities::{
        app_config::{RecordingStatus, get_app_config},
        request::ActiveModel,
        response,
    },
    schedular::get_res_trace_id,
    server_context::get_db_connect,
};

pub mod body_write_to_file;
pub mod message;
pub mod request_record;
use http::HeaderMap;
use sea_orm::{ActiveModelTrait, Set};
use serde_json::Value;

use crate::entities::request;

pub static PROXY_BOARD_CAST: Lazy<Arc<broadcast::Sender<message::MessageLog>>> = Lazy::new(|| {
    let (tx, _) = broadcast::channel::<message::MessageLog>(10);

    Arc::new(tx)
});

pub fn has_receiver() -> bool {
    let tx = Arc::clone(&PROXY_BOARD_CAST);
    tx.receiver_count() > 0
}

pub async fn can_send_message() -> bool {
    let app_config = get_app_config().await;
    if !matches!(app_config.recording_status, RecordingStatus::StartRecording) {
        debug!("recording status is not start recording, skip send message");
        return false;
    }
    if !has_receiver() {
        debug!("no receiver, skip send message");
        return false;
    }
    true
}

pub async fn try_send_message(msg: message::MessageLog) {
    if !can_send_message().await {
        return;
    }
    let tx = Arc::clone(&PROXY_BOARD_CAST);
    if tx.send(msg).is_err() {
        error!("send request raw failed");
    }
    debug!("send message success");
}

pub async fn try_send_request_message(request_model: ActiveModel) -> Result<Option<i32>> {
    if !can_send_message().await {
        return Ok(None);
    }
    let data = request_model.insert(get_db_connect()).await?;
    let request_id = data.id;
    let tx = Arc::clone(&PROXY_BOARD_CAST);
    if tx.send(message::MessageLog::Request(data)).is_err() {
        error!("send request raw failed");
    }

    return Ok(Some(request_id));
}

pub fn create_request_active_model_by_req(
    req: &http::Request<hyper::body::Incoming>,
) -> request::ActiveModel {
    request::ActiveModel::from(req)
}

pub async fn try_send_req_message(
    mut req_active_model: request::ActiveModel,
    res: Option<&hyper::Response<hyper::body::Incoming>>,
) -> Result<()> {
    // fill request model
    if let Some(res) = res {
        let status_code = res.status().as_u16();
        let response_mime_type = res
            .headers()
            .get(http::header::CONTENT_TYPE)
            .map(|v| v.to_str().unwrap_or("").to_string());
        req_active_model.status_code = Set(Some(status_code));
        req_active_model.response_mime_type = Set(response_mime_type);
    }

    let request_id = try_send_request_message(req_active_model).await?;

    if let (Some(request_id), Some(res)) = (request_id, res) {
        let trace_id = get_res_trace_id(res);

        // save response model
        save_res(res, request_id, trace_id.clone()).await;
    }
    return Ok(());
}

/// Send message with response
pub async fn save_res(
    res: &hyper::Response<hyper::body::Incoming>,
    request_id: i32,
    tracing_id: Arc<String>,
) -> Result<()> {
    let mut response = response::ActiveModel::from(res);

    response.request_id = Set(request_id);
    response.trace_id = Set(tracing_id.to_string());

    return Ok(());
}
/// Get headers and their size from a HeaderMap
pub fn get_header_and_size(header_map: &HeaderMap) -> (Value, usize) {
    let headers = header_map
        .iter()
        .map(|(k, v)| (k.as_str().to_string(), v.to_str().unwrap_or("").to_string()))
        .collect();
    let header_size: usize = header_map
        .iter()
        .map(|(k, v)| k.as_str().len() + v.as_bytes().len())
        .sum();
    (headers, header_size)
}
