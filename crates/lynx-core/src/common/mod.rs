use anyhow::anyhow;
use http::{Request, Response};
use http_body_util::{BodyExt, combinators::BoxBody as HttpBoxBody};
use hyper::body::Incoming;

pub type HyperReq = hyper::Request<Incoming>;
pub type HyperRes = hyper::Response<Incoming>;

pub type BoxBody = HttpBoxBody<bytes::Bytes, anyhow::Error>;
pub type Req = Request<BoxBody>;
pub type Res = Response<BoxBody>;

pub trait HyperReqExt {
    fn into_box_req(self) -> Req;
}

impl HyperReqExt for HyperReq {
    fn into_box_req(self) -> Req {
        let (parts, body) = self.into_parts();
        let body = body
            .map_err(|e| anyhow!(e).context("http request body box error"))
            .boxed();
        Request::from_parts(parts, body)
    }
}

pub trait HyperResExt {
    fn into_box_res(self) -> Res;
}

impl HyperResExt for HyperRes {
    fn into_box_res(self) -> Res {
        let (parts, body) = self.into_parts();
        let body = body
            .map_err(|e| anyhow!(e).context("http response body box error"))
            .boxed();
        Response::from_parts(parts, body)
    }
}
