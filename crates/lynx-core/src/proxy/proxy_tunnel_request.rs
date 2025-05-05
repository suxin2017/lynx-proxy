use anyhow::{Ok, Result};
use hyper::{Method, Response};
use hyper_util::rt::TokioIo;
use tokio::io::{AsyncRead, AsyncWrite};
use tokio::net::{TcpStream, ToSocketAddrs};
use tracing::{error, trace};

use crate::common::{HyperReq, Res};
use crate::utils::{empty, host_addr};

fn handle_tunnel_error(err: anyhow::Error) {
    error!("Error handling tunnel: {}", err);
}

pub async fn proxy_tunnel_proxy(req: HyperReq) -> anyhow::Result<Res> {
    assert_eq!(req.method(), Method::CONNECT);

    tokio::task::spawn(async move {
        let res = tunnel_proxy_by_req(req).await;
        if let Err(err) = res {
            handle_tunnel_error(err);
        }
    });

    Ok(Response::new(empty()))
}

pub async fn tunnel(req: HyperReq) -> Result<()> {
    let addr = host_addr(req.uri()).ok_or_else(|| anyhow::anyhow!("Invalid URI: {}", req.uri()))?;

    let upgraded = hyper::upgrade::on(req).await?;

    let mut server = TcpStream::connect(addr).await?;

    let mut upgraded = TokioIo::new(upgraded);

    // Proxying data
    let (from_client, from_server) =
        tokio::io::copy_bidirectional(&mut upgraded, &mut server).await?;

    trace!(
        "client wrote {} bytes and received {} bytes",
        from_client, from_server
    );

    Ok(())
}

pub async fn tunnel_proxy_by_req(req: HyperReq) -> Result<()> {
    let addr = host_addr(req.uri()).ok_or_else(|| anyhow::anyhow!("Invalid URI: {}", req.uri()))?;

    let upgraded = hyper::upgrade::on(req).await?;
    tunnel_proxy_by_stream(TokioIo::new(upgraded), addr).await?;
    Ok(())
}

pub async fn tunnel_proxy_by_stream<S: AsyncRead + AsyncWrite + Unpin, A: ToSocketAddrs>(
    mut stream: S,
    addr: A,
) -> Result<()> {
    // let mut upgraded = TokioIo::new(stream);
    let mut server = TcpStream::connect(addr).await?;

    // Proxying data
    let (from_client, from_server) =
        tokio::io::copy_bidirectional(&mut stream, &mut server).await?;

    trace!(
        "client wrote {} bytes and received {} bytes",
        from_client, from_server
    );

    Ok(())
}
