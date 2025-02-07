use anyhow::{anyhow, Result};
use tokio::fs::File;
use tracing::{info, trace};

use std::fmt;

use crate::server_context::APP_CONFIG;

use super::has_receiver;

enum BodyType {
    Request,
    Response,
}

impl fmt::Display for BodyType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            BodyType::Request => write!(f, "req"),
            BodyType::Response => write!(f, "res"),
        }
    }
}

async fn body_file(trace_id: &String, body_type: BodyType) -> Result<File> {
    let raw_root_dir = &APP_CONFIG.get().expect("app config not init").raw_root_dir;
    let trace_dir = raw_root_dir.join(trace_id);
    if !trace_dir.exists() {
        tokio::fs::create_dir(&trace_dir).await?;
    }

    let raw_path = File::create(trace_dir.join(format!("{}", body_type)))
        .await
        .map_err(|e| anyhow!(e).context("create file error"))?;

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
