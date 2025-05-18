use std::sync::Arc;

use anyhow::{Ok, Result};
use axum::body::Body;
use axum::response::Response;
use hyper::Method;
use hyper_util::rt::TokioIo;
use tokio::io::{AsyncRead, AsyncWrite};
use tokio::net::{TcpStream, ToSocketAddrs};
use tokio::spawn;
use tracing::{error, event, trace};

use crate::common::Req;
use crate::layers::message_package_layer::{MessageEventCannel, MessageEventLayerExt};
use crate::layers::trace_id_layer::service::{TraceId, TraceIdExt};
use crate::utils::host_addr;

use super::tunnel_proxy_by_stream::tunnel_proxy_by_stream;

fn handle_tunnel_error(err: anyhow::Error) {
    error!("Error handling tunnel: {}", err);
}

pub async fn proxy_tunnel_proxy(req: Req) -> anyhow::Result<Response> {
    assert_eq!(req.method(), Method::CONNECT);

    tokio::task::spawn(async move {
        let res = tunnel_proxy_by_req(req).await;
        if let Err(err) = res {
            handle_tunnel_error(err);
        }
    });

    Ok(Response::new(Body::empty()))
}

pub async fn tunnel_proxy_by_req(req: Req) -> Result<()> {
    let trace_id = req.extensions().get_trace_id();
    let event_cannel = req.extensions().get_message_event_cannel();
    let addr = host_addr(req.uri()).ok_or_else(|| anyhow::anyhow!("Invalid URI: {}", req.uri()))?;

    let upgraded = hyper::upgrade::on(req).await?;

    tunnel_proxy_by_stream(TokioIo::new(upgraded), addr, trace_id, event_cannel).await?;

    Ok(())
}
