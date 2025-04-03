use anyhow::{Result, anyhow};
use tokio::fs::{File, OpenOptions};
use tracing::trace;

use std::fmt;

use crate::server_context::get_app_config;

use super::has_receiver;

enum BodyType {
    Request,
    Response,
    WebsocketMessage,
}

impl fmt::Display for BodyType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            BodyType::Request => write!(f, "req"),
            BodyType::Response => write!(f, "res"),
            BodyType::WebsocketMessage => write!(f, "ws"),
        }
    }
}

async fn body_file(trace_id: &String, body_type: BodyType) -> Result<File> {
    let raw_root_dir = &get_app_config().raw_root_dir;
    let trace_dir = raw_root_dir.join(trace_id);
    if !trace_dir.exists() {
        tokio::fs::create_dir_all(&trace_dir).await?;
    }
    let raw_path = OpenOptions::new()
        .create(true)
        .append(true)
        .open(trace_dir.join(format!("{}", body_type)))
        .await
        .map_err(|e| anyhow!(e).context("open file error"))?;

    Ok(raw_path)
}

pub async fn req_body_file(trace_id: &String) -> Result<File> {
    if has_receiver() {
        body_file(trace_id, BodyType::Request).await
    } else {
        trace!("no receiver, skip write request body");
        Err(anyhow!("no receiver, skip write request body"))
    }
}

pub async fn res_body_file(trace_id: &String) -> Result<File> {
    if has_receiver() {
        body_file(trace_id, BodyType::Response).await
    } else {
        trace!("no receiver, skip write response body");
        Err(anyhow!("no receiver, skip write response body"))
    }
}

pub async fn ws_body_file(trace_id: &String) -> Result<File> {
    if has_receiver() {
        body_file(trace_id, BodyType::WebsocketMessage).await
    } else {
        trace!("no receiver, skip write response body");
        Err(anyhow!("no receiver, skip write response body"))
    }
}
