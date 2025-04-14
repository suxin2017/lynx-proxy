use anyhow::Result;
use hyper::service::service_fn;
use hyper_util::{
    rt::{TokioExecutor, TokioIo},
    server::conn::auto,
};
use tokio_rustls::{TlsAcceptor, rustls::ServerConfig};

use std::{net::SocketAddr, sync::Arc};
use tokio::net::TcpListener;

use crate::common::{
    constant::{TEST_LOCALHOST_CERT, TEST_LOCALHOST_KEY},
    test_server::test_server,
};

pub async fn start_http_server_with_port(port: u16) -> Result<SocketAddr> {
    let listener = TcpListener::bind(SocketAddr::from(([127, 0, 0, 1], port))).await?;
    let addr = listener.local_addr()?;
    println!("start test http server at {}", addr);

    tokio::spawn(async move {
        loop {
            let (tcp, _) = listener.accept().await.unwrap();
            tokio::task::spawn(async move {
                let _ = auto::Builder::new(TokioExecutor::new())
                    .serve_connection_with_upgrades(
                        TokioIo::new(tcp),
                        service_fn(|req| test_server(req, addr)),
                    )
                    .await;
            });
        }
    });

    Ok(addr)
}

pub async fn start_http_server() -> Result<SocketAddr> {
    let listener = TcpListener::bind(SocketAddr::from(([127, 0, 0, 1], 0))).await?;
    let addr = listener.local_addr()?;
    println!("start test http server at {}", addr);

    tokio::spawn(async move {
        loop {
            let (tcp, _) = listener.accept().await.unwrap();

            tokio::task::spawn(async move {
                let _ = auto::Builder::new(TokioExecutor::new())
                    .serve_connection_with_upgrades(
                        TokioIo::new(tcp),
                        service_fn(|req| test_server(req, addr)),
                    )
                    .await;
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
                        service_fn(|req| {
                            println!("req: {:?}", req);

                            test_server(req, addr)
                        }),
                    )
                    .await
                {
                    eprintln!("Test mode HTTPS connect error: {err:#}");
                };
            });
        }
    });
    Ok(addr)
}
