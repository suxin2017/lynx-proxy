
use anyhow::Error;
use futures_util::{FutureExt, StreamExt};
use http::StatusCode;
use http_body_util::combinators::BoxBody;
use http_body_util::BodyExt;
use hyper::body::{Bytes, Incoming};
use hyper::service::service_fn;
use hyper::{Method, Request, Response};
use hyper_util::rt::{TokioExecutor, TokioIo};
use tokio_rustls::TlsAcceptor;
use tracing::{info, trace};

use crate::cert::CERT_MANAGER;
use crate::plugins::http_request_plugin::HttpRequestPlugin;
use crate::utils::empty;

pub struct HttpsProxy {}

impl HttpsProxy {
    pub async fn proxy(
        &self,
        req: Request<Incoming>,
    ) -> anyhow::Result<Response<BoxBody<Bytes, Error>>> {
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
            tokio::task::spawn(async move {
                match hyper::upgrade::on(req).await {
                    Ok(upgraded) => {
                        let upgraded = TokioIo::new(upgraded);
                        trace!("upgrade success");
                        let ca_manager = CERT_MANAGER.get().expect("cert manager not found");
                        let server_config = match ca_manager.gen_server_config(&authority).await {
                            Ok(server_config) => server_config,
                            Err(err) => {
                                eprintln!("Failed to build server config: {err}");
                                return;
                            }
                        };
                        trace!("{}", &authority);

                        trace!("build tls stream");
                        let stream = match TlsAcceptor::from(server_config).accept(upgraded).await {
                            Ok(stream) => stream,
                            Err(err) => {
                                eprintln!("Failed to build tls stream: {err}");
                                return;
                            }
                        };
                        let service = service_fn(|req| async move {
                            info!("proxying http request {:?}", req);

                            let prosy_res = HttpRequestPlugin {}.request(req).await;
                            match prosy_res {
                                Ok(origin_res) => {
                                    let proxy_res = {
                                        let (parts, body) = origin_res.into_parts();
                                        Response::from_parts(parts, body.boxed())
                                    };

                                    trace!("proxy response: {:?}", proxy_res);

                                    Ok(proxy_res)
                                }

                                Err(e) => {
                                    info!("proxy error: {:?}", e);
                                    Err(e)
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
        Ok(Response::new(empty()))
    }
}
