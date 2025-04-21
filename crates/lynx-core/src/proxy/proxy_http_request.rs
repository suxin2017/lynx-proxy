use anyhow::Result;
use http::Request;
use hyper::body::Body;

use crate::{
    client::request_client::RequestClientExt,
    common::{HyperReq, HyperReqExt, HyperResExt, Res},
};

pub async fn proxy_http_request(req: HyperReq) -> Result<Res> {
    let http_client = req.extensions().get_http_client();

    let res = http_client.request(req.into_box_req()).await?;

    Ok(res.into_box_res())
}
