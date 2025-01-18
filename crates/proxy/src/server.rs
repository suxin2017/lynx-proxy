use std::net::SocketAddr;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;

use anyhow::Result;
use derive_builder::Builder;
use http::StatusCode;
use hyper::body::Incoming;
use hyper::service::service_fn;
use hyper::{Request, Response};
use hyper_util::rt::{TokioExecutor, TokioIo};
use local_ip_address::local_ip;
use tokio::net::TcpListener;
use tracing::{error, info, trace};

use crate::schedular::Schedular;
use crate::self_service::{handle_self_service, match_self_service};
use crate::server_context::ServerContext;
use crate::utils::full;

pub struct Server {
    pub port: u16,
    pub context: Arc<ServerContext>,
    pub local_addr: SocketAddr,
    pub access_addr_list: Vec<SocketAddr>,
}




impl Server {
    pub fn new(port: u16, context: ServerContext) -> Self {
        let mut access_addr_list = vec![];
        access_addr_list.push(SocketAddr::from(([127, 0, 0, 1], port)));
        if let Ok(access_addr) = local_ip() {
            access_addr_list.push(SocketAddr::new(access_addr, port));
        }
        Self {
            port,
            context:Arc::new(context),
            local_addr: SocketAddr::from(([127,0,0,1], port)),
            access_addr_list,
        }
    }

    async fn test_lister(&self,addr: SocketAddr) -> SocketAddr{
        let listener = TcpListener::bind(addr).await.unwrap();
        let addr = listener.local_addr().unwrap();
        let context = Arc::clone(&self.context);

        tokio::spawn(async move {
            loop {
                let (stream, client_addr) = listener.accept().await.unwrap();
                let io = TokioIo::new(stream);
                let context = Arc::clone(&context);
    
                // Spawn a tokio task to serve multiple connections concurrently
                tokio::task::spawn(async move {
                    if let Err(err) =
                        hyper_util::server::conn::auto::Builder::new(TokioExecutor::new())
                            .serve_connection_with_upgrades(
                                io,
                                service_fn(move |req: Request<Incoming>| {
                                    let context = Arc::clone(&context);
                                    async move {

                                    if match_self_service(&req) {
                                        return handle_self_service(context,req).await;
                                    }
                                    let res = Schedular {}.dispatch(context,req).await;
    
                                    match res {
                                        Ok(res) => Ok(res),
                                        Err(e) => {
                                            error!("Server error: {}", &e);
                                            let res = Response::builder()
                                                .status(StatusCode::INTERNAL_SERVER_ERROR)
                                                .body(full(format!("{}", e)));
                                            Ok(res?)
                                        }
                                    }
                                }
                }),
                            )
                            .await
                    {
                        eprintln!("Error serving connection: {:?}", err);
                    }
                });
            }
        });
        addr
    }

    pub async fn run(&mut self) -> Result<()> {
        let addrs = self.access_addr_list
        .iter()
        .map(|addr| format!("  http://{}\n", addr))
        .collect::<Vec<String>>()
        .join("");
        info!("start server at {}", addrs);
        println!(
            "Available on: \n{}",
            addrs
        );
    
        // for addr in self.access_addr_list.iter() {
          self.local_addr =  self.test_lister(self.local_addr).await;
        // }
        Ok(())
    }
}

