use std::net::SocketAddr;

use anyhow::{Ok, Result};
use bytes::Bytes;
use derive_builder::Builder;
use futures_util::future::join_all;
use http_body_util::Full;
use hyper::body::Incoming;
use hyper::{Request, Response};
use hyper_util::rt::{TokioExecutor, TokioIo};
use hyper_util::server::conn::auto;
use hyper_util::service::TowerToHyperService;
use local_ip_address::list_afinet_netifas;
use tokio::net::TcpListener;
use tower::ServiceBuilder;
use tracing::{trace, warn};

use crate::layers::log_layer::LogLayer;
use crate::layers::req_extension_layer::RequestExtensionLayer;
use crate::layers::trace_id_layer::TraceIdLayer;
use crate::layers::trace_id_layer::service::TraceIdExt;

#[derive(Builder)]
#[builder(build_fn(skip))]
pub struct ProxyServer {
    #[builder(setter(strip_option))]
    pub port: Option<u16>,
    #[builder(setter(skip))]
    access_addr_list: Vec<SocketAddr>,
}

impl ProxyServerBuilder {
    async fn build(&self) -> Result<ProxyServer> {
        let port = self.port.flatten().unwrap_or(0);
        let network_interfaces = list_afinet_netifas().expect("get network interfaces error");

        let access_addr_list: Vec<SocketAddr> = network_interfaces
            .into_iter()
            .filter(|(_, ip)| ip.is_ipv4())
            .map(|(_, ip)| ip)
            .map(|ip| SocketAddr::new(ip, port))
            .collect();
        Ok(ProxyServer {
            port: self.port.flatten(),
            access_addr_list,
        })
    }
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

async fn hello(r: Request<Incoming>) -> Result<Response<Full<Bytes>>> {
    println!(
        "{:?} {:?}",
        r.extensions().get::<ClientAddr>().unwrap().0,
        r.get_trace_id()
    );

    Ok(Response::new(Full::new(Bytes::from("Hello, World!"))))
}

#[derive(Clone)]
struct ClientAddr(SocketAddr);

impl ProxyServer {
    pub async fn run(&self) -> Result<()> {
        self.bind_tcp_listener_to_hyper().await?;
        Ok(())
    }

    async fn bind_tcp_listener(&self) -> Result<Vec<TcpListener>> {
        let bind_future = self
            .access_addr_list
            .iter()
            .map(|addr| async move {
                let listener = TcpListener::bind(*addr).await?;
                trace!("Server started on: http://{}", addr);
                Ok(listener)
            })
            .collect::<Vec<_>>();
        let tcp_listener = join_all(bind_future).await;

        tcp_listener.into_iter().collect()
    }

    async fn bind_hyper(&self, listener: TcpListener) -> Result<()> {
        tokio::spawn(async move {
            loop {
                let (stream, client_addr) = listener.accept().await.expect("accept failed");
                let io = TokioIo::new(stream);
                tokio::task::spawn(async move {
                    let svc = tower::service_fn(hello);
                    let svc = ServiceBuilder::new()
                        .layer(LogLayer {})
                        .layer(TraceIdLayer)
                        .layer(RequestExtensionLayer::new(ClientAddr(client_addr)))
                        .service(svc);
                    let svc = TowerToHyperService::new(svc);
                    let connection = auto::Builder::new(TokioExecutor::new())
                        .serve_connection_with_upgrades(io, svc)
                        .await;
                    if let Err(err) = connection {
                        warn!("Error serving connection: {:?}", err);
                    }
                });
            }
        });
        Ok(())
    }

    async fn bind_tcp_listener_to_hyper(&self) -> Result<()> {
        let tcp_listeners = self.bind_tcp_listener().await?;

        for tcp_listener in tcp_listeners {
            self.bind_hyper(tcp_listener).await?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn build_test() -> Result<()> {
        ProxyServerBuilder::default().port(3000).build().await?;
        Ok(())
    }

    #[tokio::test]
    async fn listener_test() -> Result<()> {
        let server = ProxyServerBuilder::default().port(3000).build().await?;

        let data = server.bind_tcp_listener().await?;

        for result in data {
            let addr = result.local_addr()?;
            println!("Tcp started on: {}", addr);
        }
        Ok(())
    }

    #[tokio::test]
    async fn hyper_test() -> Result<()> {
        let server = ProxyServerBuilder::default().port(3000).build().await?;

        let tcp_listeners = server.bind_tcp_listener().await?;

        for tcp_listener in tcp_listeners {
            server.bind_hyper(tcp_listener).await?;
        }
        Ok(())
    }

    #[tokio::test]
    async fn run_test() -> Result<()> {
        let server = ProxyServerBuilder::default().port(3000).build().await?;

        server.run().await?;
        Ok(())
    }
}
