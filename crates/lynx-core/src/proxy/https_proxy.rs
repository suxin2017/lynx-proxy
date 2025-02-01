use std::sync::Arc;

use anyhow::Error;
use http::StatusCode;
use http_body_util::combinators::BoxBody;
use hyper::body::{Bytes, Incoming};
use hyper::service::service_fn;
use hyper::{Method, Request, Response};
use hyper_util::rt::{TokioExecutor, TokioIo};
use nanoid::nanoid;
use tokio_rustls::TlsAcceptor;
use tracing::{error, info, trace};

use crate::proxy::http_proxy::proxy_http_request;
use crate::server_context::CA_MANAGER;
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
                        let ca_manager = CA_MANAGER.get().expect("cert manager not found");
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
                        let service = service_fn(|mut req| async move {
                            info!("proxying http request {:?}", req);

                            req.extensions_mut().insert(Arc::new(nanoid!()));

                            let res = proxy_http_request(req).await;

                            return match res {
                                Ok(res) => Ok::<_, hyper::Error>(res),
                                Err(err) => {
                                    error!("proxy http request error: {}", err.to_string());
                                    Ok(Response::new(empty()))
                                }
                            };
                        });
                        if let Err(err) =
                            hyper_util::server::conn::auto::Builder::new(TokioExecutor::new())
                                .serve_connection_with_upgrades(TokioIo::new(stream), service)
                                .await
                        {
                            error!("HTTPS proxy connect error: {}", err.to_string());
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
