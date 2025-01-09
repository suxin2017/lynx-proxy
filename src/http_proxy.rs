use std::convert::Infallible;
use std::net::SocketAddr;

use anyhow::{anyhow, Result};
use futures_util::{FutureExt, StreamExt};
use http_body_util::combinators::BoxBody;
use http_body_util::{BodyExt, Empty, Full};
use hyper::body::{Bytes, Incoming};
use hyper::server::conn::http1;
use hyper::service::service_fn;
use hyper::upgrade::Upgraded;
use hyper::{upgrade, Method, Request, Response};
use hyper_rustls::HttpsConnectorBuilder;
use hyper_util::client::legacy::connect::HttpConnector;
use hyper_util::client::legacy::Client;
use hyper_util::rt::{TokioExecutor, TokioIo};
use tokio::net::{TcpListener, TcpStream};
use tracing::{info, trace};

use crate::utils::{empty, host_addr, is_http, is_https};

pub struct HttpProxy {}

impl HttpProxy {
    pub async fn guard(&self, req: &Request<Incoming>) -> anyhow::Result<()> {
        if !is_http(req.uri()) {
            return Err(anyhow::anyhow!("Not a http request"));
        }

        Ok(())
    }
    pub async fn proxy(
        &self,
        req: Request<Incoming>,
    ) -> anyhow::Result<Response<BoxBody<Bytes, hyper::Error>>> {
        info!("proxying http request {:?}", req);

        let prosy_res = Middleman {}.request(req).await;

        trace!("origin response: {:?}", prosy_res);

        match prosy_res {
            Ok(origin_res) => {
                let proxy_res = {
                    let (parts, body) = origin_res.into_parts();
                    Response::from_parts(parts, body.boxed())
                };

                trace!("proxy response: {:?}", proxy_res);

                return Ok(proxy_res);
            }

            Err(e) => {
                info!("proxy error: {:?}", e);
                return Err(anyhow::Error::new(e));
            }
        }
    }
}

struct Middleman {}

impl Middleman {
    // 处理请求前
    pub async fn pre_request(&self, req: Request<Incoming>) -> Result<Request<Incoming>> {
        unimplemented!()
        // let mut req = req;
        // let uri = req.uri().clone();
        // let mut parts = req.into_parts();
        // let (scheme, authority, path_and_query) = {
        //     let uri = uri.clone();
        //     (
        //         uri.scheme_str().unwrap_or("http"),
        //         uri.authority()
        //             .map(|auth| auth.to_string())
        //             .unwrap_or("".to_string()),
        //         uri.path_and_query()
        //             .map(|pq| pq.to_string())
        //             .unwrap_or("".to_string()),
        //     )
        // };

        // let uri = format!("{}://{}{}", scheme, authority, path_and_query);
        // let uri = uri.parse().unwrap();
        // parts.0.uri = uri;

        // let req = Request::from_parts(parts.0, parts.1);
        // return Ok(req);
    }

    pub async fn request(
        &self,
        req: Request<Incoming>,
    ) -> Result<Response<Incoming>, hyper_util::client::legacy::Error> {
        let cilent_builder = Client::builder(TokioExecutor::new());
        let prosy_res = if is_https(req.uri()) {
            cilent_builder
                .build(
                    HttpsConnectorBuilder::new()
                        .with_webpki_roots()
                        .https_only()
                        .enable_all_versions()
                        .build(),
                )
                .request(req)
                .await
        } else {
            cilent_builder
                .build(HttpConnector::new())
                .request(req)
                .await
        };

        return prosy_res;
    }

    // 处理请求后
    pub async fn post_request(
        &self,
        res: Response<Incoming>,
    ) -> Result<Response<Incoming>, hyper_util::client::legacy::Error> {
        unimplemented!()
        // let mut res = res;
        // let (parts, body) = res.into_parts();
        // let stream = body.frame().await;
        // stream.unwrap().unwrap().map_data(|d|{
        // });

        // let body = body.into_bytes().await?;
        // let res = Response::from_parts(parts, body.into());
        // return Ok(res);
    }
}
