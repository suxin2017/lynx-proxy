use std::sync::Arc;

use anyhow::Result;
use tokio::{
    io::{AsyncRead, AsyncWrite},
    net::{TcpStream, ToSocketAddrs},
};
use tracing::{trace, warn};

use crate::layers::{message_package_layer::MessageEventCannel, trace_id_layer::service::TraceId};

pub async fn tunnel_proxy_by_stream<
    S: AsyncRead + AsyncWrite + Unpin + Send + 'static,
    A: ToSocketAddrs,
>(
    mut stream: S,
    addr: A,
    trace_id: TraceId,
    event_cannel: Arc<MessageEventCannel>,
) -> Result<()> {
    // let mut upgraded = TokioIo::new(stream);
    let mut server = TcpStream::connect(addr).await?;

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
