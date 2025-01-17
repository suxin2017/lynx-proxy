
use anyhow::{anyhow, Error, Result};
use futures_util::{FutureExt, StreamExt};
use http_body_util::combinators::BoxBody;
use http_body_util::{BodyExt, StreamBody};
use hyper::body::{Bytes, Incoming};
use hyper::{Request, Response};
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use tracing::{info, trace};

use crate::plugins::http_request_plugin::HttpRequestPlugin;
use crate::utils::is_http;

pub struct HttpProxy {}

impl HttpProxy {
    pub async fn guard(&self, req: &Request<Incoming>) -> bool {
        return is_http(req.uri());
    }
    pub async fn proxy(&self, req: Request<Incoming>) -> Result<Response<BoxBody<Bytes, Error>>> {
        info!("proxying http request {:?}", req);

        let proxy_res = HttpRequestPlugin {}.request(req).await?;

        trace!("origin response: {:?}", proxy_res);

        let (parts, body) = proxy_res.into_parts();
        let mut body = body
            .map_err(|e| anyhow!(e).context("http proxy body box error"))
            .boxed();

        let (tx, rx) = mpsc::channel(1024);

        let rec_stream = ReceiverStream::new(rx);
        // let rs = rec_stream.;
        let stream: BoxBody<Bytes, Error> = BodyExt::boxed(StreamBody::new(rec_stream));

        tokio::task::spawn(async move {
            while let Some(frame) =body.frame().await  {
                if let Ok(frame) = &frame {
                    dbg!(frame);

                }
                let _ = tx.send(frame).await;
            }
        });

        let proxy_req = Response::from_parts(parts, stream);
        Ok(proxy_req)
    }
}
