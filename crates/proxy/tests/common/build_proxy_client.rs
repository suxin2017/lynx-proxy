use anyhow::{anyhow, Result};
use async_compression::tokio::bufread::GzipEncoder;
use bytes::{Bytes, BytesMut};
use futures_util::{SinkExt, TryStreamExt};
use http::{
    header::{CONTENT_ENCODING, CONTENT_TYPE},
    Method, StatusCode,
};
use http_body_util::{combinators::BoxBody, BodyDataStream, BodyExt, Full, StreamBody};
use hyper::{
    body::{Body, Frame, Incoming},
    service::service_fn,
    Request, Response,
};
use hyper_util::{
    rt::{TokioExecutor, TokioIo},
    server::conn::auto,
};
use proxy_server::{server::Server, utils::is_https};
use reqwest::Certificate;
use tokio_rustls::{
    rustls::{
        pki_types::{CertificateDer, PrivateKeyDer},
        ServerConfig,
    },
    TlsAcceptor,
};
use tokio_stream::{wrappers::BroadcastStream, StreamExt};
use tracing_subscriber::{
    filter::FilterFn, fmt, layer::SubscriberExt, util::SubscriberInitExt, Layer,
};

use std::{
    env,
    fs::{self, File},
    io::{self, Read},
    net::SocketAddr,
    path::PathBuf,
    sync::{mpsc, Arc},
    time::Duration,
};
use tokio::{net::TcpListener, sync::oneshot, time::interval};
use tokio::{sync::broadcast, time::timeout};
use tokio_graceful::Shutdown;
use tokio_tungstenite::tungstenite::Message;
use tokio_util::io::ReaderStream;

use super::constant::TEST_ROOT_CA_CERT;

pub fn build_request_client(
    proxy_server_addr: Option<&str>,
    is_https: bool,
    ca_cert: Option<Certificate>,
) -> Result<reqwest::Client> {
    let mut client = reqwest::Client::builder()
        .no_brotli()
        .no_deflate()
        .no_gzip();
    if let Some(proxy_server_addr) = proxy_server_addr {
        let proxy = reqwest::Proxy::all(proxy_server_addr).unwrap();
        client = client.proxy(proxy);
    }
    if is_https {
        client = client.use_rustls_tls();
    }
    if let Some(ca_cert) = ca_cert {
        client = client.add_root_certificate(ca_cert);
    }
    Ok(client.build()?)
}

pub fn build_http_proxy_client(proxy_server_addr: &str) -> reqwest::Client {
    return build_request_client(Some(proxy_server_addr), false, None).unwrap();
}

pub fn build_https_proxy_client(proxy_server_addr: &str) -> reqwest::Client {
    return build_request_client(Some(proxy_server_addr), true, None).unwrap();
}

pub fn build_http_client() -> reqwest::Client {
    return build_request_client(None, false, None).unwrap();
}

pub fn build_https_client(ca_cert: Certificate) -> reqwest::Client {
    return build_request_client(None, true, Some(ca_cert)).unwrap();
}
