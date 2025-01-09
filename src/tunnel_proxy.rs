use std::convert::Infallible;
use std::net::SocketAddr;

use anyhow::Result;
use http_body_util::combinators::BoxBody;
use http_body_util::{BodyExt, Empty, Full};
use hyper::body::{Bytes, Incoming};
use hyper::server::conn::http1;
use hyper::service::service_fn;
use hyper::upgrade::Upgraded;
use hyper::{upgrade, Method, Request, Response};
use hyper_util::rt::{TokioExecutor, TokioIo};
use tokio::net::{TcpListener, TcpStream};

use crate::utils::{empty, host_addr};

pub struct TunnelProxy {}

impl TunnelProxy {
    pub async fn guard(&self, req: &Request<Incoming>) -> anyhow::Result<()> {
        // Extract the host and port from the request URI
        if Method::CONNECT != req.method() {
            return Err(anyhow::anyhow!("Method is not connect"));
        }
        Ok(())
    }
    pub async fn proxy(
        &self,
        req: Request<Incoming>,
    ) -> anyhow::Result<Response<BoxBody<Bytes, hyper::Error>>> {
        // Extract the host and port from the request URI
        if Method::CONNECT == req.method() {
            if let Some(addr) = host_addr(req.uri()) {
                tokio::task::spawn(async move {
                    match hyper::upgrade::on(req).await {
                        Ok(upgraded) => {
                            if let Err(e) = tunnel(upgraded, addr).await {
                                eprintln!("server io error: {}", e);
                            };
                        }
                        Err(e) => {
                            eprintln!("upgrade error: {:?}", e)
                        }
                    }
                });
            }
        }

        Ok(Response::new(empty()))
    }
}

pub async fn tunnel(upgraded: Upgraded, addr: String) -> std::io::Result<()> {
    let mut server = TcpStream::connect(addr).await?;
    let mut upgraded = TokioIo::new(upgraded);
    // Proxying data
    let (from_client, from_server) =
        tokio::io::copy_bidirectional(&mut upgraded, &mut server).await?;

    // Print message when done
    println!(
        "client wrote {} bytes and received {} bytes",
        from_client, from_server
    );

    Ok(())
}
