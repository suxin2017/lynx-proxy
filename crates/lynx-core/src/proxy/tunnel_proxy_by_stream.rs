use std::sync::Arc;
use std::time::Duration;

use anyhow::Result;
use socket2::{SockRef, TcpKeepalive};
use tokio::{
    io::{AsyncRead, AsyncWrite},
    net::{TcpStream, ToSocketAddrs},
};
use tracing::{trace, warn};

use crate::layers::{message_package_layer::MessageEventChannel, trace_id_layer::service::TraceId};

fn configure_tcp_keepalive(stream: &TcpStream) {
    let sock_ref = SockRef::from(stream);
    let keepalive = TcpKeepalive::new()
        .with_time(Duration::from_secs(60))
        .with_interval(Duration::from_secs(30));
    if let Err(e) = sock_ref.set_tcp_keepalive(&keepalive) {
        warn!("failed to set TCP keepalive: {:?}", e);
    }
}

pub async fn tunnel_proxy_by_stream<
    S: AsyncRead + AsyncWrite + Unpin + Send + 'static,
    A: ToSocketAddrs,
>(
    mut stream: S,
    addr: A,
    trace_id: TraceId,
    event_cannel: Arc<MessageEventChannel>,
) -> Result<()> {
    let mut server = TcpStream::connect(addr).await?;
    configure_tcp_keepalive(&server);

    event_cannel
        .dispatch_on_tunnel_start(trace_id.clone())
        .await;
    let res = tokio::io::copy_bidirectional(&mut stream, &mut server).await;

    match res {
        Ok((from_client, from_server)) => {
            trace!(
                "client wrote {} bytes and received {} bytes",
                from_client, from_server
            );
            event_cannel.dispatch_on_tunnel_end(trace_id).await;
        }
        Err(e) => {
            warn!("tunnel error {:?}", e);
            event_cannel.dispatch_on_tunnel_end(trace_id).await;
        }
    }

    Ok(())
}
