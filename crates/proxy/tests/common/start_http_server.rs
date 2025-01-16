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

use crate::common::{
    constant::{TEST_LOCALHOST_CERT, TEST_LOCALHOST_KEY},
    test_server::test_server,
};

pub async fn start_http_server() -> Result<SocketAddr> {
    let listener = TcpListener::bind(SocketAddr::from(([127, 0, 0, 1], 54259))).await?;
    let addr = listener.local_addr()?;
    println!("start test http server at {}", addr);

    tokio::spawn(async move {
        loop {
            let (tcp, _) = listener.accept().await.unwrap();

            tokio::task::spawn(async move {
                println!("connect is comme");
                let _ = auto::Builder::new(TokioExecutor::new())
                    .serve_connection_with_upgrades(TokioIo::new(tcp), service_fn(test_server))
                    .await;

                println!("end session");
            });
        }
    });

    Ok(addr)
}

pub async fn start_https_server() -> Result<SocketAddr> {
    let listener = TcpListener::bind(SocketAddr::from(([127, 0, 0, 1], 0))).await?;
    let addr: SocketAddr = listener.local_addr().unwrap();
    println!("start test https server at {}", addr);
    let cert_chain = TEST_LOCALHOST_CERT.as_ref().unwrap().clone();
    // Build TLS configuration.
    let mut server_config = ServerConfig::builder()
        .with_no_client_auth()
        .with_single_cert(cert_chain, TEST_LOCALHOST_KEY.as_ref().unwrap().clone_key())
        .unwrap();

    server_config.alpn_protocols = vec![b"h2".to_vec(), b"http/1.1".to_vec(), b"http/1.0".to_vec()];

    let tls_acceptor = TlsAcceptor::from(Arc::new(server_config));

    tokio::spawn(async move {
        loop {
            println!("accepting connection...");
            let (tcp_stream, _remote_addr) = listener.accept().await.unwrap();
            let tls_acceptor = tls_acceptor.clone();
            tokio::spawn(async move {
                let tls_stream = match tls_acceptor.accept(tcp_stream).await {
                    Ok(tls_stream) => tls_stream,
                    Err(err) => {
                        eprintln!("failed to perform tls handshake: {err:#}");
                        return;
                    }
                };

                if let Err(err) = hyper_util::server::conn::auto::Builder::new(TokioExecutor::new())
                    .serve_connection_with_upgrades(
                        TokioIo::new(tls_stream),
                        service_fn(test_server),
                    )
                    .await
                {
                    if !err
                        .to_string()
                        .starts_with("error shutting down connection")
                    {
                        eprintln!("HTTPS connect error: {err}");
                    }
                };

            });
        }
    });
    Ok(addr)
}
