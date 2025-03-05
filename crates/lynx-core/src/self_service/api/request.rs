use std::collections::HashMap;

use crate::config::REQ_DIR;
use crate::entities::{request, response};
use crate::proxy_log::PROXY_BOARD_CAST;
use crate::self_service::utils::{OperationError, ValidateError, response_ok};
use crate::server_context::{APP_CONFIG, DB};
use anyhow::{Error, Result, anyhow};
use bytes::Bytes;
use futures_util::{StreamExt, TryStreamExt};
use http::HeaderValue;
use http::header::{CACHE_CONTROL, CONTENT_TYPE};
use http_body_util::combinators::BoxBody;
use http_body_util::{BodyExt, StreamBody};
use hyper::body::{Frame, Incoming};
use hyper::{Request, Response};
use sea_orm::EntityTrait;
use tokio::fs::File;
use tokio_stream::wrappers::{BroadcastStream, ReadDirStream};
use tokio_util::io::ReaderStream;
use tracing::{error, trace};

pub async fn handle_request_log() -> Result<Response<BoxBody<Bytes, Error>>> {
    let rx = PROXY_BOARD_CAST.subscribe();
    let rx_stream = BroadcastStream::new(rx)
        .then(|result| async {
            match result {
                Ok(d) => match serde_json::to_string(&d) {
                    Ok(json_str) => Ok(Frame::data(Bytes::from(format!("{}\n", json_str)))),
                    Err(e) => {
                        error!("serialization error: {:?}", e);
                        Err(anyhow!(e))
                    }
                },
                Err(e) => {
                    error!("broadcast stream error: {:?}", e);
                    Err(anyhow!(e))
                }
            }
        })
        .map_err(|e| {
            error!("broadcast stream error: {:?}", e);
            anyhow!(e)
        });

    let body = BodyExt::boxed(StreamBody::new(rx_stream));

    let mut res = Response::new(body);
    res.headers_mut().insert(
        CONTENT_TYPE,
        HeaderValue::from_static("application/octet-stream"),
    );
    res.headers_mut()
        .insert(CACHE_CONTROL, HeaderValue::from_static("no-cache"));

    Ok(res)
}

pub async fn handle_request_clear() -> Result<Response<BoxBody<Bytes, Error>>> {
    trace!("clear request and response data");
    let db = DB.get().unwrap();
    request::Entity::delete_many().exec(db).await?;
    response::Entity::delete_many().exec(db).await?;

    trace!("clear raw data");
    let raw_root_dir = &APP_CONFIG.get().unwrap().raw_root_dir;
    trace!("clear raw data: {}", raw_root_dir.display());
    let entries = tokio::fs::read_dir(raw_root_dir)
        .await
        .map_err(|e| anyhow!(e).context("clear raw data error".to_string()))?;

    let read_dir_stream = ReadDirStream::new(entries);
    read_dir_stream
        .for_each(|entry| async {
            if let Ok(path) = entry {
                let p = path.path();
                tokio::fs::remove_dir_all(p).await.unwrap();
            }
        })
        .await;
    response_ok::<Option<()>>(None)
}

pub async fn handle_request_body(
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
    let id = params.get("id");
    if id.is_none() {
        return Err(anyhow!(ValidateError::new(
            "requestId is required".to_string()
        )));
    }
    let id = id.unwrap().parse::<i32>().map_err(|e| anyhow!(e))?;

    let request = request::Entity::find_by_id(id)
        .one(DB.get().unwrap())
        .await?;
    if request.is_none() {
        return Err(anyhow!(OperationError::new(
            "response not found".to_string()
        )));
    }
    let request = request.unwrap();

    let assert_root = &APP_CONFIG.get().unwrap().raw_root_dir;
    let filename = assert_root.join(format!("{}/{}", request.trace_id, REQ_DIR));
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
