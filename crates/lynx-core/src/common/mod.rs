use http::Response;
use http_body_util::combinators::BoxBody;
use hyper::body::Incoming;

pub type HyperReq = hyper::Request<Incoming>;
pub type HyperRes = hyper::Response<Incoming>;

pub type Req = Response<BoxBody<bytes::Bytes, anyhow::Error>>;
pub type Res = Response<BoxBody<bytes::Bytes, anyhow::Error>>;
