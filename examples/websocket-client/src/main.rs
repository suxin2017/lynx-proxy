use futures_util::{SinkExt, StreamExt};
use rustls::{ClientConfig, RootCertStore, pki_types::CertificateDer};
use std::{fs, io, path::PathBuf, sync::Arc};
use tokio::spawn;
use tokio::sync::mpsc::unbounded_channel;
use tokio_tungstenite::{Connector, connect_async_tls_with_config};
use url::Url;

#[tokio::main]
async fn main() {
    let manifest_dir = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap());

    rustls::crypto::ring::default_provider()
        .install_default()
        .unwrap_or_default();

    let url = Url::parse("ws://localhost:3000").unwrap();

    // create root cert store
    let mut root_cert_store: RootCertStore = RootCertStore::empty();
    // add webpki roots
    root_cert_store.extend(webpki_roots::TLS_SERVER_ROOTS.iter().cloned());

    let cert_file =
        fs::File::open(manifest_dir.join("../websocket-server/self_signed_certs/cert.pem"))
            .unwrap();

    let mut reader = io::BufReader::new(cert_file);

    let cert_chain: io::Result<Vec<CertificateDer<'static>>> =
        rustls_pemfile::certs(&mut reader).collect();

    for cert in cert_chain.unwrap() {
        root_cert_store.add(cert).unwrap();
    }

    let client_config = ClientConfig::builder()
        .with_root_certificates(root_cert_store)
        .with_no_client_auth();

    let connector = Connector::Rustls(Arc::new(client_config));

    let (ws_stream, _response) = connect_async_tls_with_config(url, None, false, Some(connector))
        .await
        .expect("WebSocket handshake failed");

    let (mut sink, mut stream) = ws_stream.split();
    let (shutdown_send, mut shutdown_recv) = unbounded_channel();

    spawn(async move {
        sink.send(tokio_tungstenite::tungstenite::Message::Text(
            "Hello, World!".into(),
        ))
        .await
        .expect("Failed to send message");
        while let Some(msg) = stream.next().await {
            match msg {
                Ok(msg) => {
                    println!("Received message: {:?}", msg);
                    sink.send(tokio_tungstenite::tungstenite::Message::Close(None))
                        .await
                        .unwrap();
                    shutdown_send.send(()).unwrap();
                }
                Err(e) => {
                    eprintln!("Error receiving message: {:?}", e);
                }
            }
        }
    });

    tokio::select! {
        _ = shutdown_recv.recv() => {
            println!("Shutdown signal received");
        }
        _ = tokio::signal::ctrl_c() => {
            println!("Ctrl-C signal received");
        }
    }
}
