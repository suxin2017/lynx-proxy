use std::str::FromStr;

use anyhow::Result;
use http::{
    Request, Uri,
    header::{CONNECTION, HOST, PROXY_AUTHORIZATION},
};
use tracing::info;
use url::Url;

use crate::{common::Req, layers::extend_extension_layer::clone_extensions};

pub fn build_proxy_request(req: Req) -> Result<Req> {
    let extensions = clone_extensions(req.extensions())?;
    let (parts, body) = req.into_parts();

    let uri = {
        let url = Url::from_str(parts.uri.to_string().as_str())?;
        Uri::from_str(url.as_str())?
    };

    let mut req_builder = Request::builder().method(parts.method).uri(uri);

    for (key, value) in parts.headers.iter() {
        if matches!(key, &HOST | &CONNECTION | &PROXY_AUTHORIZATION) {
            continue;
        }
        info!("header: {}: {:?}", key, value);
        req_builder = req_builder.header(key, value);
    }
    let mut proxy_req = req_builder.body(body)?;

    proxy_req.extensions_mut().extend(extensions);

    Ok(proxy_req)
}
