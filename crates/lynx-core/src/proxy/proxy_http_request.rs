use anyhow::Result;

use crate::{
    client::request_client::RequestClientExt,
    common::{HyperReq, HyperReqExt, HyperResExt, Res},
};

pub fn is_http_req(req: &HyperReq) -> bool {
    req.headers().get("Upgrade").is_none()
}

pub async fn proxy_http_request(req: HyperReq) -> Result<Res> {
    let http_client = req.extensions().get_http_client();

    let res = http_client
        .request(req.into_box_req())
        .await
        .map_err(|e| e.context("http request failed"))?;

    Ok(res.into_box_res())
}
