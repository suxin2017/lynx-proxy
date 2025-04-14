use std::collections::HashMap;

use crate::config::RES_DIR;
use crate::entities::response;
use crate::self_service::utils::{OperationError, ValidateError, response_ok};
use crate::server_context::{get_db_connect, APP_CONFIG};
use anyhow::{Error, Result, anyhow};
use bytes::Bytes;
use futures_util::TryStreamExt;
use http::HeaderValue;
use http::header::CONTENT_TYPE;
use http_body_util::combinators::BoxBody;
use http_body_util::{BodyExt, StreamBody};
use hyper::body::{Frame, Incoming};
use hyper::{Request, Response};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
use tokio::fs::File;
use tokio_util::io::ReaderStream;

pub async fn handle_response(req: Request<Incoming>) -> Result<Response<BoxBody<Bytes, Error>>> {
    let params: HashMap<String, String> = req
        .uri()
        .query()
        .map(|v| {
            url::form_urlencoded::parse(v.as_bytes())
                .into_owned()
                .collect()
        })
        .unwrap_or_default();
    let request_id = params.get("requestId");
    if request_id.is_none() {
        return Err(anyhow!(ValidateError::new(
            "requestId is required".to_string()
        )));
    }

    let response = response::Entity::find()
        .filter(response::Column::RequestId.eq(request_id.unwrap()))
        .one(get_db_connect())
        .await?;
    if response.is_none() {
        return Err(anyhow!(OperationError::new(
            "response not found".to_string()
        )));
    }
    let response = response.unwrap();
    response_ok(response)
}

pub async fn handle_response_body(
    req: Request<Incoming>,
) -> Result<Response<BoxBody<Bytes, Error>>> {
    let params: HashMap<String, String> = req
        .uri()
        .query()
        .map(|v| {
            url::form_urlencoded::parse(v.as_bytes())
                .into_owned()
                .collect()
        })
        .unwrap_or_default();
    let request_id = params.get("requestId");
    if request_id.is_none() {
        return Err(anyhow!(ValidateError::new(
            "requestId is required".to_string()
        )));
    }

    let response = response::Entity::find()
        .filter(response::Column::RequestId.eq(request_id.unwrap()))
        .one(get_db_connect())
        .await?;
    if response.is_none() {
        return Err(anyhow!(OperationError::new(
            "response not found".to_string()
        )));
    }
    let response = response.unwrap();

    let assert_root = &APP_CONFIG.get().unwrap().raw_root_dir;
    let filename = assert_root.join(format!("{}/{}", response.trace_id, RES_DIR));
    let file = File::open(filename).await;
    if file.is_err() {
        eprintln!("ERROR: Unable to open file.");
    }
    let file = file?;
    let reader_stream = ReaderStream::new(file);
    let stream_body = StreamBody::new(
        reader_stream
            .map_ok(Frame::data)
            .map_err(|e| anyhow!(e).context("response body stream error")),
    );
    let boxed_body = BodyExt::boxed(stream_body);
    Ok(Response::builder()
        .header(
            CONTENT_TYPE,
            HeaderValue::from_static("application/octet-stream"),
        )
        .body(boxed_body)?)
}
