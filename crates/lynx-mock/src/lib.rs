use anyhow::{Result, anyhow};
use async_compression::tokio::bufread::GzipEncoder;
use bytes::Bytes;
use futures_util::{SinkExt, TryStreamExt};
use http::{
    HeaderValue, Method, StatusCode,
    header::{CONTENT_ENCODING, CONTENT_TYPE},
};
use http_body_util::{BodyExt, Full, StreamBody, combinators::BoxBody};
use hyper::{
    Request, Response,
    body::{Frame, Incoming},
};
use hyper_tungstenite::tungstenite::Message;
use once_cell::sync::Lazy;
use tokio_stream::{StreamExt, wrappers::BroadcastStream};

use std::{sync::Arc, time::Duration};
use tokio::sync::broadcast;
use tokio::time::interval;
use tokio_util::io::ReaderStream;

mod mark_service;
mod mock_server_fn;
pub mod server;
pub mod client;