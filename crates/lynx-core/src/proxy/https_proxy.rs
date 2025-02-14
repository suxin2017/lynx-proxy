use std::sync::Arc;

use anyhow::Error;
use http::uri::Scheme;
use http::{StatusCode, Uri, Version};
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

pub async fn https_proxy(
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
    // Upgrade to tls connect
    if Method::CONNECT == req.method() {
        tokio::task::spawn(async move {
            match hyper::upgrade::on(req).await {
                Ok(upgraded) => {
                    let upgraded = TokioIo::new(upgraded);
                    let ca_manager = CA_MANAGER.get().expect("cert manager not found");
                    let server_config = match ca_manager.gen_server_config(&authority).await {
                        Ok(server_config) => server_config,
                        Err(err) => {
                            error!("Failed to build server config: {err}");
                            return;
                        }
                    };
                    trace!("start build tls stream");
                    let stream = match TlsAcceptor::from(server_config).accept(upgraded).await {
                        Ok(stream) => stream,
                        Err(err) => {
                            error!("Failed to build tls stream: {err}");
                            return;
                        }
                    };
                    trace!("end build tls stream");
                    let service = service_fn(|mut req| {
                        let authority = authority.clone();
                        async move {
                            if matches!(req.version(), Version::HTTP_10 | Version::HTTP_11) {
                                let (mut parts, body) = req.into_parts();

                                parts.uri = {
                                    let mut parts = parts.uri.into_parts();
                                    parts.scheme = Some(Scheme::HTTPS);
                                    parts.authority = Some(authority);
                                    Uri::from_parts(parts).expect("Failed to build URI")
                                };

                                req = Request::from_parts(parts, body);
                            }

                            info!("proxying http request {:?}", req);
                            req.extensions_mut().insert(Arc::new(nanoid!()));
                            let res = proxy_http_request(req).await;
                            match res {
                                Ok(res) => Ok::<_, hyper::Error>(res),
                                Err(err) => {
                                    error!("proxy http request error: {}", err.to_string());
                                    Ok(Response::new(empty()))
                                }
                            }
                        }
                    });
                    if let Err(err) =
                        hyper_util::server::conn::auto::Builder::new(TokioExecutor::new())
                            .serve_connection_with_upgrades(TokioIo::new(stream), service)
                            .await
                    {
                        error!("HTTPS proxy connect error: {:?}", err);
                    }
                }
                Err(e) => {
                    error!("upgrade error: {:?}", e)
                }
            }
        });
    }
    Ok(Response::new(empty()))
}
