use std::net::SocketAddr;

use anyhow::Result;
use http::StatusCode;
use http_body_util::combinators::BoxBody;
use hyper::body::Incoming;
use hyper::service::service_fn;
use hyper::{Request, Response};
use hyper_util::rt::{TokioExecutor, TokioIo};
use local_ip_address::local_ip;
use tokio::net::TcpListener;
use tracing::{error, info, warn};

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

impl Server {
    pub fn new(port: u16) -> Self {
        let mut access_addr_list = vec![];
        access_addr_list.push(SocketAddr::from(([127, 0, 0, 1], port)));
        if let Ok(access_addr) = local_ip() {
            access_addr_list.push(SocketAddr::new(access_addr, port));
        }

        Self {
            port,
            access_addr_list,
        }
    }

    pub async fn run(&mut self) -> Result<()> {
        let mut new_addrs = Vec::new();
        for addr in self.access_addr_list.iter() {
            let addr = test_lister(*addr).await;
            new_addrs.push(addr);
        }
        self.access_addr_list = new_addrs;
        let addrs = self
            .access_addr_list
            .iter()
            .map(|addr| format!("  http://{}\n", addr))
            .collect::<Vec<String>>()
            .join("");
        println!("Available on: \n{}", addrs);
        Ok(())
    }
}
