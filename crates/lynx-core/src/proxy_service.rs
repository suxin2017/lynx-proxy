use anyhow::{Result, anyhow};
use bytes::Bytes;
use http::{Request, Response};
use http_body_util::{BodyExt, Full};
use reqwest::Body;

use crate::{
    client::{request_client::RequestClientExt, websocket_client},
    common::{HyperReq, Req, Res},
    utils::{empty, full},
};

use tower::{make::MakeService, service_fn};

pub async fn proxy_service_fn(req: HyperReq) -> Result<Res> {
    Ok(Response::new(full("Hello World!")))
}
