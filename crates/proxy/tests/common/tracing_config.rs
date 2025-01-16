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


pub fn init_tracing() {
    let my_filter = FilterFn::new(|metadata| {
        // Only enable spans or events with the target "interesting_things"
        {
            metadata.target().starts_with("proxy")
        }
    });
    tracing_subscriber::registry()
        .with(fmt::layer().with_filter(my_filter))
        .init();
}
