use std::convert::Infallible;
use std::net::SocketAddr;

use anyhow::{anyhow, Result};
use futures_util::{FutureExt, StreamExt};
use http::StatusCode;
use http_body_util::combinators::BoxBody;
use http_body_util::{BodyExt, Empty, Full};
use hyper::body::{self, Bytes, Incoming};
use hyper::server::conn::http1;
use hyper::service::service_fn;
use hyper::upgrade::Upgraded;
use hyper::{upgrade, Method, Request, Response};
use hyper_rustls::HttpsConnectorBuilder;
use hyper_util::client::legacy::connect::HttpConnector;
use hyper_util::client::legacy::Client;
use hyper_util::rt::{TokioExecutor, TokioIo};
use tokio::io::AsyncReadExt;
use tokio::net::{TcpListener, TcpStream};
use tokio_rustls::TlsAcceptor;
use tracing::{debug, info, trace};

use crate::cert::CERT_MANAGER;
use crate::utils::{empty, full, host_addr, is_http, is_https};

pub struct HttpsProxy {}

impl HttpsProxy {
    pub async fn guard(&self, req: &Request<Incoming>) -> bool {
        return is_https(req.uri());
    }
    pub async fn proxy(
        &self,
        req: Request<Incoming>,
    ) -> anyhow::Result<Response<BoxBody<Bytes, hyper::Error>>> {
        info!("proxy https request");
        let mut res = Response::default();
        let authority = match req.uri().authority().cloned() {
            Some(authority) => authority,
            None => {
                *res.status_mut() = StatusCode::BAD_REQUEST;
                return Ok(res);
            }
        };
        // Extract the host and port from the request URI
        if Method::CONNECT == req.method() {
            if let Some(addr) = host_addr(req.uri()) {
                tokio::task::spawn(async move {
                    match hyper::upgrade::on(req).await {
                        Ok(upgraded) => {
                            let upgraded = TokioIo::new(upgraded);

                            trace!("upgrade success");
                            let ca_manager = CERT_MANAGER.get().expect("cert manager not found");
                            let server_config = match ca_manager.gen_server_config(&authority).await
                            {
                                Ok(server_config) => server_config,
                                Err(err) => {
                                    eprintln!("Failed to build server config: {err}");
                                    return;
                                }
                            };

                            trace!("build tls stream");
                            let stream =
                                match TlsAcceptor::from(server_config).accept(upgraded).await {
                                    Ok(stream) => stream,
                                    Err(err) => {
                                        eprintln!("Failed to build tls stream: {err}");
                                        return;
                                    }
                                };
                            let service = service_fn(|req| async move {
                                info!("proxying http request {:?}", req);
                                let prosy_res = HttpsMiddleman {}.request(req).await;
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
                            });
                            if let Err(err) =
                                hyper_util::server::conn::auto::Builder::new(TokioExecutor::new())
                                    .serve_connection_with_upgrades(TokioIo::new(stream), service)
                                    .await
                            {
                                if !err
                                    .to_string()
                                    .starts_with("error shutting down connection")
                                {
                                    eprintln!("HTTPS connect error: {err}");
                                }
                            }
                        }
                        Err(e) => {
                            eprintln!("upgrade error: {:?}", e)
                        }
                    }
                });
            }
        }
        return Ok(Response::new(empty()));
    }
}

struct HttpsMiddleman {}

impl HttpsMiddleman {
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
        let uri = req.uri().clone();
        let method = req.method().clone();
        let mut builder = hyper::Request::builder().uri(uri).method(method);

        for (key, value) in req.headers().iter() {
            builder = builder.header(key.clone(), value.clone());
        }

        let body = req.into_parts();
        let proxy_req = match builder.body(body.1) {
            Ok(v) => v,
            Err(err) => {
                trace!("build request error: {:?}", err);
                eprintln!("build request error: {:?}", err);
                unreachable!();
            }
        };
        let cilent_builder = Client::builder(TokioExecutor::new());
        let prosy_res = cilent_builder
            .build(
                HttpsConnectorBuilder::new()
                    .with_webpki_roots()
                    .https_only()
                    .enable_all_versions()
                    .build(),
            )
            .request(proxy_req)
            .await;

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
