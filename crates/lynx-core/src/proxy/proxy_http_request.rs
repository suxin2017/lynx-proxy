use anyhow::Result;
use http::Request;
use hyper::body::Body;

use crate::{
    client::request_client::RequestClientExt,
    common::{HyperReq, HyperReqExt, HyperResExt, Res},
};

pub async fn proxy_http_request(req: HyperReq) -> Result<Res> {
    tracing::debug!("proxy_http_request: {:?}", req);
    let http_client = req.extensions().get_http_client();

    let res = http_client
        .request(req.into_box_req())
        .await
        .map_err(|e| e.context("http request failed"))?;
    tracing::debug!("proxy_http_request response: {:?}", res);
    Ok(res.into_box_res())
}
