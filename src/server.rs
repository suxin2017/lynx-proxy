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
use tokio::net::TcpListener;
use tokio::net::TcpStream;
use tracing::{debug, trace};

use crate::schedular::Schedular;
use crate::tunnel_proxy::TunnelProxy;
use crate::utils::full;

pub async fn handle_service(
    req: Request<hyper::body::Incoming>,
) -> Result<Response<BoxBody<Bytes, hyper::Error>>> {
    trace!("Received request: {:?}", req);
    let schedular = Schedular {};
    schedular.dispatch(req).await
}
pub struct Server {}

impl Server {
    pub async fn run(&self) -> Result<()> {
        let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
        println!("start server at 127.0.0.0.1:3000");

        // We create a TcpListener and bind it to 127.0.0.1:3000
        let listener = TcpListener::bind(addr).await?;

        tokio::spawn(async move {
            // We start a loop to continuously accept incoming connections
            loop {
                let (stream, _) = listener.accept().await.unwrap();
                trace!("Accepted connection");
                // Use an adapter to access something implementing `tokio::io` traits as if they implement
                // `hyper::rt` IO traits.
                let io = TokioIo::new(stream);

                // Spawn a tokio task to serve multiple connections concurrently
                tokio::task::spawn(async move {
                    if let Err(err) =
                        hyper_util::server::conn::auto::Builder::new(TokioExecutor::new())
                            .serve_connection_with_upgrades(io, service_fn(handle_service))
                            .await
                    {
                        eprintln!("Error serving connection: {:?}", err);
                    }
                });
            }
        });
        Ok(())
    }
}
