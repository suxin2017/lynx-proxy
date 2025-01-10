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
use proxy_rust::server::Server;
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

pub const HELLO_WORLD: &str = "Hello, World!";
pub const WORLD: &str = "world";

async fn test_server(req: Request<Incoming>) -> Result<Response<BoxBody<Bytes, anyhow::Error>>> {
    if hyper_tungstenite::is_upgrade_request(&req) {
        let (res, ws) = hyper_tungstenite::upgrade(req, None)?;

        tokio::spawn(async move {
            let mut ws = ws.await.unwrap();

            while let Some(msg) = ws.next().await {
                let msg = msg.unwrap();
                if msg.is_close() {
                    break;
                }
                ws.send(Message::Text(WORLD.into())).await.unwrap();
            }
        });

        let (parts, body) = res.into_parts();
        let bytes = body.collect().await?.to_bytes();
        let body = Full::new(bytes).map_err(|err| anyhow!("{err}")).boxed();

        return Ok(Response::from_parts(parts, body));
    }

    match (req.method(), req.uri().path()) {
        (&Method::GET, "/hello") => Ok(Response::new(
            Full::new(Bytes::from(HELLO_WORLD))
                .map_err(|err| anyhow!("{err}"))
                .boxed(),
        )),
        (&Method::GET, "/hello/gzip") => {
            let stream_body = StreamBody::new(
                ReaderStream::new(GzipEncoder::new(HELLO_WORLD.as_bytes()))
                    .map_ok(Frame::data)
                    .map_err(|err| anyhow!("{err}")),
            );
            let res = Response::builder()
                .header(CONTENT_ENCODING, "gzip")
                .status(StatusCode::OK)
                .body(BoxBody::new(stream_body))?;
            Ok(res)
        }
        (&Method::POST, "/echo") => {
            let content_type = req.headers().get(CONTENT_TYPE).cloned();
            let bytes = req.collect().await?.to_bytes();
            let body = Full::new(bytes).map_err(|err| anyhow!("{err}")).boxed();
            let mut res = Response::new(body);
            if let Some(content_type) = content_type {
                res.headers_mut().insert(CONTENT_TYPE, content_type);
            }
            Ok(res)
        }
        (&Method::POST, "/ping") => {
            let (tx, mut rx1) = broadcast::channel(16);
            tokio::spawn(async move {
                let mut interval = interval(Duration::from_secs(1));
                let mut count = 0;
                loop {
                    interval.tick().await;
                    if tx.send("pong\n").is_err() {
                        break;
                    }
                    if (count > 30) {
                        break;
                    }
                    count += 1;
                }
            });
            let stream = BroadcastStream::new(rx1);
            let stream = stream
                .map_ok(|data| Frame::data(Bytes::from(data)))
                .map_err(|err| anyhow!(err));

            let body = BodyExt::boxed(StreamBody::new(stream));

            let res = Response::new(body);

            Ok(res)
        }
        _ => {
            let mut res = Response::default();
            *res.status_mut() = StatusCode::NOT_FOUND;
            Ok(res)
        }
    }
}

pub async fn start_proxy() -> Result<()> {
    Server {}.run().await?;
    Ok(())
}

pub async fn start_http_server() -> Result<(SocketAddr, oneshot::Sender<()>)> {
    let listener = TcpListener::bind(SocketAddr::from(([127, 0, 0, 1], 0))).await?;
    let addr = listener.local_addr()?;
    let (tx, rx) = oneshot::channel();
    println!("start test server at 127.0.0.1:0");

    tokio::spawn(async move {
        let server = auto::Builder::new(TokioExecutor::new());
        let shutdown = Shutdown::new(async { rx.await.unwrap_or_default() });
        let guard = shutdown.guard_weak();

        loop {
            tokio::select! {
                res = listener.accept() => {
                    let Ok((tcp, _)) = res else {
                        continue;
                    };

                    let server = server.clone();

                    shutdown.spawn_task(async move {
                        let _ = server
                            .serve_connection_with_upgrades(TokioIo::new(tcp), service_fn(test_server))
                            .await;
                    });
                }
                _ = guard.cancelled() => {
                    break;
                }
            }
        }

        shutdown.shutdown().await;
    });

    Ok((addr, tx))
}

pub async fn start_https_server() -> Result<()> {
    let listener = TcpListener::bind(SocketAddr::from(([127, 0, 0, 1], 8900))).await?;
    println!("start test server at 127.0.0.1:8900");
    println!("accepting connection...");
    // 获取当前工作目录
    let current_dir = env::current_dir().expect("Failed to get current directory");
    println!("Current directory: {:?}", current_dir);
    // Load public certificate.
    let certs = load_certs(
        current_dir
            .join("tests/fixtures/localhost.crt")
            .to_str()
            .unwrap(),
    )?;
    println!("certs: {:?}", certs);
    // Load private key.
    let key = load_private_key(
        current_dir
            .join("tests/fixtures/localhost.key")
            .to_str()
            .unwrap(),
    )?;
    // Build TLS configuration.
    let mut server_config = ServerConfig::builder()
        .with_no_client_auth()
        .with_single_cert(certs, key)
        .map_err(|e| error(e.to_string()))?;
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
                }
            });
        }
    });
    Ok(())
}

#[tokio::test]
async fn feature_test() {
    match start_https_server().await {
        Ok(_) => {
            println!("ok");
        }
        Err(e) => {
            println!("err: {:?}", e);
        }
    }
}

pub fn build_proxy_client(proxy: &str) -> Result<reqwest::Client> {
    let proxy = reqwest::Proxy::all(proxy)?;

    let client = reqwest::Client::builder()
        .proxy(proxy)
        .no_brotli()
        .no_deflate()
        .no_gzip()
        .build()?;

    Ok(client)
}

pub fn init_tracing() {
    let my_filter = FilterFn::new(|metadata| {
        // Only enable spans or events with the target "interesting_things"
        {
            metadata.target().starts_with("proxy_rust")
        }
    });
    tracing_subscriber::registry()
        .with(fmt::layer().with_filter(my_filter))
        .init();
}

fn error(err: String) -> io::Error {
    io::Error::new(io::ErrorKind::Other, err)
}

pub async fn build_proxy_https_client() {
    // 获取当前工作目录
    let current_dir = env::current_dir().expect("Failed to get current directory");

    // Load public certificate.
    let certs = current_dir.join("tests/fixtures/RootCA.pem");

    let mut buf = Vec::new();
    File::open(certs).unwrap().read_to_end(&mut buf).unwrap();
    let cert = reqwest::Certificate::from_pem(&buf).unwrap();
    let req = reqwest::Client::builder()
        .use_rustls_tls()
        .add_root_certificate(cert)
        .no_brotli()
        .no_deflate()
        .no_gzip()
        .build()
        .unwrap();

    let res = req
        .get("https://localhost:8900/hello")
        .send()
        .await
        .unwrap();
    dbg!(res);
}

// Load public certificate from file.
fn load_certs(filename: &str) -> io::Result<Vec<CertificateDer<'static>>> {
    // Open certificate file.
    let certfile = fs::File::open(filename)
        .map_err(|e| error(format!("failed to open {}: {}", filename, e)))?;
    let mut reader = io::BufReader::new(certfile);

    // Load and return certificate.
    rustls_pemfile::certs(&mut reader).collect()
}

// Load private key from file.
fn load_private_key(filename: &str) -> io::Result<PrivateKeyDer<'static>> {
    // Open keyfile.
    let keyfile = fs::File::open(filename)
        .map_err(|e| error(format!("failed to open {}: {}", filename, e)))?;
    let mut reader = io::BufReader::new(keyfile);

    // Load and return a single private key.
    rustls_pemfile::private_key(&mut reader).map(|key| key.unwrap())
}
