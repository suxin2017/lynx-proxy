use std::path::PathBuf;
use std::{fs, io};
use std::{net::SocketAddr, sync::Arc};

use anyhow::{Error, Result, anyhow};
use futures_util::{SinkExt, future};
use http_body_util::Full;
use http_body_util::{BodyExt, Empty, combinators::BoxBody};
use hyper::Request;
use hyper::body::Incoming;
use hyper::service::service_fn;
use hyper::{Response, body::Bytes};
use hyper_tungstenite::{HyperWebsocket, tungstenite::Message};
use hyper_util::rt::{TokioExecutor, TokioIo};
use tokio::net::TcpListener;
use tokio_rustls::TlsAcceptor;
use tokio_rustls::rustls::ServerConfig;
use tokio_rustls::rustls::pki_types::{CertificateDer, PrivateKeyDer};

use tokio_stream::StreamExt;

#[tokio::main]
async fn main() {
    websocket_server().await.unwrap();
    tokio::signal::ctrl_c().await.unwrap();
}
pub fn empty() -> BoxBody<Bytes, Error> {
    Empty::<Bytes>::new().map_err(|_| unreachable!()).boxed()
}

pub fn get_server_config() -> Result<ServerConfig> {
    let manifest_dir = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR")?);

    // Open certificate file.
    let cert_file = fs::File::open(manifest_dir.join("self_signed_certs/cert.pem"))?;

    let mut reader = io::BufReader::new(cert_file);

    let cert_chain: io::Result<Vec<CertificateDer<'static>>> =
        rustls_pemfile::certs(&mut reader).collect();

    let cert_chain = cert_chain?;

    let keyfile = fs::File::open(manifest_dir.join("self_signed_certs/key.pem"))?;
    let mut reader = io::BufReader::new(keyfile);

    let key_der = rustls_pemfile::private_key(&mut reader).map(|key| key.unwrap())?;

    Ok(ServerConfig::builder()
        .with_no_client_auth()
        .with_single_cert(cert_chain, key_der.clone_key())?)
}

pub async fn is_https_tcp_stream(tcp_stream: &tokio::net::TcpStream) -> bool {
    let mut buf = [0; 1];
    match tcp_stream.peek(&mut buf).await {
        Ok(n) => n == 1 && buf[0] == 0x16,
        Err(_) => false,
    }
}

// support http and https websocket
pub async fn websocket_server() -> Result<()> {
    let listener = TcpListener::bind(SocketAddr::from(([127, 0, 0, 1], 3000))).await?;
    // Build TLS configuration.
    let server_config = get_server_config()?;
    let tls_acceptor = TlsAcceptor::from(Arc::new(server_config));

    tokio::spawn(async move {
        loop {
            println!("accepting connection...");
            let (tcp_stream, _remote_addr) = listener.accept().await.unwrap();
            let tls_acceptor = tls_acceptor.clone();
            tokio::spawn(async move {
                if is_https_tcp_stream(&tcp_stream).await {
                    let tls_stream = match tls_acceptor.accept(tcp_stream).await {
                        Ok(tls_stream) => tls_stream,
                        Err(err) => {
                            eprintln!("failed to perform tls handshake: {:#}", err);
                            return;
                        }
                    };
                    hyper_util::server::conn::auto::Builder::new(TokioExecutor::new())
                        .serve_connection_with_upgrades(TokioIo::new(tls_stream), service_fn(echo))
                        .await
                        .unwrap();
                } else {
                    hyper_util::server::conn::auto::Builder::new(TokioExecutor::new())
                        .serve_connection_with_upgrades(TokioIo::new(tcp_stream), service_fn(echo))
                        .await
                        .unwrap();
                }
            });
        }
    });
    Ok(())
}

async fn echo(req: Request<Incoming>) -> Result<Response<BoxBody<Bytes, anyhow::Error>>> {
    // websocket
    if hyper_tungstenite::is_upgrade_request(&req) {
        let (res, ws) = hyper_tungstenite::upgrade(req, None)?;
        tokio::spawn(async move {
            let mut ws = ws.await.unwrap();

            while let Some(msg) = ws.next().await {
                match msg {
                    Ok(msg) => {
                        println!("Received message: {:?}", msg);
                        ws.send(msg).await.unwrap();
                    }
                    Err(e) => {
                        eprintln!("Error receiving message: {:?}", e);
                        break;
                    }
                }
            }
        });

        let (parts, body) = res.into_parts();
        let bytes = body.collect().await?.to_bytes();
        let body = Full::new(bytes).map_err(|err| anyhow!("{err}")).boxed();
        let res_result = Response::from_parts(parts, body);
        return Ok(res_result);
    }

    let res = Response::new(
        Full::new(Bytes::from("hello world"))
            .map_err(|e| anyhow!(e))
            .boxed(),
    );

    Ok(res)
}
