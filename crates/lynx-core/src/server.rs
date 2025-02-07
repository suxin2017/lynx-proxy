use std::net::{IpAddr, SocketAddr};

use anyhow::Result;
use http::StatusCode;
use http_body_util::combinators::BoxBody;
use hyper::body::Incoming;
use hyper::service::service_fn;
use hyper::{Request, Response};
use hyper_util::rt::{TokioExecutor, TokioIo};
use local_ip_address::{list_afinet_netifas, local_ip};
use tokio::net::TcpListener;
use tracing::{error, info, trace, warn};

use crate::schedular::dispatch;
use crate::utils::full;

pub struct Server {
    pub port: u16,
    pub access_addr_list: Vec<SocketAddr>,
}

async fn test_lister(addr: SocketAddr) -> SocketAddr {
    let listener = TcpListener::bind(addr).await.unwrap();
    let addr = listener.local_addr().unwrap();

    tokio::spawn(async move {
        loop {
            let (stream, _client_addr) = listener.accept().await.unwrap();
            let io = TokioIo::new(stream);
            // Spawn a tokio task to serve multiple connections concurrently
            tokio::task::spawn(async move {
                if let Err(err) = hyper_util::server::conn::auto::Builder::new(TokioExecutor::new())
                    .serve_connection_with_upgrades(
                        io,
                        service_fn(move |req: Request<Incoming>| async move {
                            let res = dispatch(req).await;

                            match res {
                                Ok(res) => Ok::<
                                    Response<BoxBody<bytes::Bytes, anyhow::Error>>,
                                    anyhow::Error,
                                >(res),
                                Err(e) => {
                                    error!("Server error: {}", &e);
                                    let res = Response::builder()
                                        .status(StatusCode::INTERNAL_SERVER_ERROR)
                                        .body(full(format!("{}", e)));
                                    Ok(res?)
                                }
                            }
                        }),
                    )
                    .await
                {
                    warn!("Error serving connection: {:?}", err);
                }
            });
        }
    });
    addr
}

#[derive(Debug)]
pub struct ServerConfig {
    pub port: u16,
    pub only_localhost: bool,
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            port: 3000,
            only_localhost: false,
        }
    }
}

impl Server {
    pub fn new(config: ServerConfig) -> Self {
        let ServerConfig {
            port,
            only_localhost,
        } = config;
        let network_interfaces = list_afinet_netifas().expect("get network interfaces error");

        let access_addr_list: Vec<SocketAddr> = network_interfaces
            .into_iter()
            .filter(|x| {
                if only_localhost {
                    x.1.is_ipv4() && x.1.is_loopback()
                } else {
                    x.1.is_ipv4()
                }
            })
            .map(|x| x.1)
            .map(|ip| SocketAddr::new(ip, port))
            .collect();

        Self {
            port,
            access_addr_list,
        }
    }

    pub async fn run(&mut self) -> Result<()> {
        let mut new_addrs = Vec::new();
        for addr in self.access_addr_list.iter() {
            let addr = test_lister(*addr).await;
            trace!("Server started on: http://{}", addr);
            new_addrs.push(addr);
        }
        self.access_addr_list = new_addrs;
        Ok(())
    }
}
