use std::convert::Infallible;
use std::net::SocketAddr;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{mpsc, Arc};

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

use crate::cert::CertificateAuthority;
use crate::schedular::Schedular;
use crate::tunnel_proxy::TunnelProxy;
use crate::utils::{empty, full};

pub async fn handle_service(
    req: Request<hyper::body::Incoming>,
) -> Result<Response<BoxBody<Bytes, hyper::Error>>> {
    trace!("Received request: {:?}", req);
    let schedular = Schedular {};
    schedular.dispatch(req).await
}
pub struct Server {}

impl Server {
    pub fn new() -> Self {
        Self {}
    }
    pub async fn run(&self) -> Result<()> {
        let connection_count = Arc::new(AtomicUsize::new(0));
        let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
        println!("start server at 127.0.0.0.1:3000");

        // We create a TcpListener and bind it to 127.0.0.1:3000
        let listener = TcpListener::bind(addr).await?;

        tokio::spawn(async move {
            // We start a loop to continuously accept incoming connections
            loop {
                let (stream, _) = listener.accept().await.unwrap();
                let connection_count = Arc::clone(&connection_count);
                connection_count.fetch_add(1, Ordering::SeqCst);
                trace!("Accepted connection");
                // Use an adapter to access something implementing `tokio::io` traits as if they implement
                // `hyper::rt` IO traits.
                let io = TokioIo::new(stream);
                trace!(
                    "current connect count: {}",
                    connection_count.load(Ordering::SeqCst)
                );

                // Spawn a tokio task to serve multiple connections concurrently
                tokio::task::spawn(async move {
                    if let Err(err) =
                        hyper_util::server::conn::auto::Builder::new(TokioExecutor::new())
                            .serve_connection_with_upgrades(io, service_fn(handle_service))
                            .await
                    {
                        eprintln!("Error serving connection: {:?}", err);
                    }
                    // Decrease the connection count when the connection is closed
                    connection_count.fetch_sub(1, Ordering::SeqCst);
                });
            }
        });
        Ok(())
    }
}
