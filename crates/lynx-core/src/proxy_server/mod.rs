use std::net::SocketAddr;
use std::sync::Arc;

use anyhow::{Ok, Result, anyhow};
use derive_builder::Builder;
use futures_util::future::join_all;
use http::Extensions;
use http_body_util::BodyExt;
use hyper_util::rt::{TokioExecutor, TokioIo};
use hyper_util::server::conn::auto;
use hyper_util::service::TowerToHyperService;
use local_ip_address::list_afinet_netifas;
use rcgen::Certificate;
use tokio::net::TcpListener;
use tower::util::Oneshot;
use tower::{ServiceBuilder, service_fn};
use tracing::{debug, trace, warn};

use crate::client::request_client::RequestClientBuilder;
use crate::common::HyperReq;
use crate::gateway_service::gateway_service_fn;
use crate::layers::error_handle_layer::ErrorHandlerLayer;
use crate::layers::log_layer::LogLayer;
use crate::layers::message_package_layer::message_event_store::MessageEventCache;
use crate::layers::message_package_layer::{MessageEventCannel, RequestMessageEventService};
use crate::layers::req_extension_layer::RequestExtensionLayer;
use crate::layers::trace_id_layer::TraceIdLayer;

pub mod server_ca_manage;
pub mod server_config;

use server_ca_manage::ServerCaManager;
use server_config::ProxyServerConfig;

#[derive(Builder)]
#[builder(build_fn(skip))]
pub struct ProxyServer {
    #[builder(setter(strip_option))]
    pub port: Option<u16>,
    #[builder(setter(skip))]
    pub access_addr_list: Vec<SocketAddr>,
    #[builder(setter(strip_option))]
    pub custom_certs: Option<Arc<Vec<Arc<Certificate>>>>,

    pub config: Arc<ProxyServerConfig>,

    pub server_ca_manager: Arc<ServerCaManager>,
}

impl ProxyServerBuilder {
    pub async fn build(&self) -> Result<ProxyServer> {
        let port = self.port.flatten().unwrap_or(0);
        let network_interfaces = list_afinet_netifas().expect("get network interfaces error");

        let access_addr_list: Vec<SocketAddr> = network_interfaces
            .into_iter()
            .filter(|(_, ip)| ip.is_ipv4())
            .map(|(_, ip)| ip)
            .map(|ip| SocketAddr::new(ip, port))
            .collect();
        let custom_certs = self.custom_certs.clone().flatten();

        Ok(ProxyServer {
            port: self.port.flatten(),
            access_addr_list,
            custom_certs,
            config: self.config.clone().expect("config is required"),
            server_ca_manager: self
                .server_ca_manager
                .clone()
                .expect("server_ca_manager is required"),
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

#[derive(Clone)]
#[allow(dead_code)]
pub struct ClientAddr(SocketAddr);

pub trait ClientAddrRequestExt {
    fn get_client_addr(&self) -> Option<ClientAddr>;
}

impl ClientAddrRequestExt for Extensions {
    fn get_client_addr(&self) -> Option<ClientAddr> {
        self.get::<ClientAddr>().cloned()
    }
}

impl ProxyServer {
    pub async fn run(&mut self) -> Result<()> {
        self.bind_tcp_listener_to_hyper().await?;
        Ok(())
    }

    async fn bind_tcp_listener(&self) -> Result<Vec<TcpListener>> {
        let bind_future = self
            .access_addr_list
            .iter()
            .map(|addr| async move {
                let listener = TcpListener::bind(*addr).await?;
                trace!("Server started on: http://{}", listener.local_addr()?);
                Ok(listener)
            })
            .collect::<Vec<_>>();
        let tcp_listener = join_all(bind_future).await;

        tcp_listener.into_iter().collect()
    }

    async fn bind_hyper(&self, listener: TcpListener) -> Result<()> {
        let client_custom_certs = self.custom_certs.clone();
        let server_ca_manager = self.server_ca_manager.clone();
        let server_config = self.config.clone();
        let message_event_store = MessageEventCache::default();
        let message_event_cannel = Arc::new(MessageEventCannel::new(Arc::new(message_event_store)));

        tokio::spawn(async move {
            loop {
                let (stream, client_addr) = listener.accept().await.expect("accept failed");
                let io = TokioIo::new(stream);

                let request_client = Arc::new(
                    RequestClientBuilder::default()
                        .custom_certs(client_custom_certs.clone())
                        .build()
                        .expect("build request client error"),
                );

                let server_ca_manager = server_ca_manager.clone();
                let server_config = server_config.clone();
                let message_event_cannel = message_event_cannel.clone();

                tokio::task::spawn(async move {
                    let svc = service_fn(gateway_service_fn);
                    let svc = ServiceBuilder::new()
                        .layer(RequestExtensionLayer::new(request_client))
                        .layer(RequestExtensionLayer::new(ClientAddr(client_addr)))
                        .layer(RequestExtensionLayer::new(server_ca_manager))
                        .layer(RequestExtensionLayer::new(server_config))
                        .layer(RequestExtensionLayer::new(message_event_cannel))
                        .layer(TraceIdLayer)
                        .layer_fn(|inner| RequestMessageEventService { service: inner })
                        .layer(LogLayer)
                        .layer(ErrorHandlerLayer)
                        .service(svc);
                    let transform_svc = service_fn(move |req: HyperReq| {
                        let svc = svc.clone();
                        async move {
                            let req = req.map(|b| b.map_err(|e| anyhow!(e)).boxed());
                            Oneshot::new(svc, req).await
                        }
                    });

                    let svc = TowerToHyperService::new(transform_svc);
                    let connection = auto::Builder::new(TokioExecutor::new())
                        .serve_connection_with_upgrades(io, svc)
                        .await;

                    if let Err(err) = connection {
                        warn!("Error serving connection: {}", err);
                        debug!("Error serving connection: {:?}", err);
                    }
                });
            }
        });
        Ok(())
    }

    async fn bind_tcp_listener_to_hyper(&mut self) -> Result<()> {
        let tcp_listeners = self.bind_tcp_listener().await?;
        let mut addrs = vec![];
        for tcp_listener in tcp_listeners {
            addrs.push(tcp_listener.local_addr()?);
            self.bind_hyper(tcp_listener).await?;
        }
        self.access_addr_list = addrs;
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
        let mut server = ProxyServerBuilder::default().port(3000).build().await?;

        server.run().await?;
        Ok(())
    }
}
