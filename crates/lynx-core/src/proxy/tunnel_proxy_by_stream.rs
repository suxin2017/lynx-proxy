use std::sync::Arc;

use anyhow::Result;
use tokio::{
    io::{AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt},
    net::{TcpStream, ToSocketAddrs},
    time::{Duration, timeout},
};

use crate::layers::{message_package_layer::MessageEventCannel, trace_id_layer::service::TraceId};

pub async fn tunnel_proxy_by_stream<
    S: AsyncRead + AsyncWrite + Unpin + Send + 'static,
    A: ToSocketAddrs,
>(
    stream: S,
    addr: A,
    trace_id: TraceId,
    event_cannel: Arc<MessageEventCannel>,
) -> Result<()> {
    let mut server = TcpStream::connect(addr).await?;
    let (mut ri, mut wi) = tokio::io::split(stream);
    let (mut ro, mut wo) = server.split();

    let idle_timeout = Duration::from_secs(60 * 60 * 24);

    let client_to_server = async {
        let mut buf = [0u8; 1024];
        loop {
            let n = timeout(idle_timeout, ri.read(&mut buf)).await??;
            if n == 0 {
                break;
            }
            wo.write_all(&buf[..n]).await?;
        }
        Ok::<_, anyhow::Error>(())
    };

    let server_to_client = async {
        let mut buf = [0u8; 1024];
        loop {
            let n = timeout(idle_timeout, ro.read(&mut buf)).await??;
            if n == 0 {
                break;
            }
            wi.write_all(&buf[..n]).await?;
        }
        Ok::<_, anyhow::Error>(())
    };

    event_cannel
        .dispatch_on_tunnel_start(trace_id.clone())
        .await;

    let result = tokio::try_join!(client_to_server, server_to_client);

    event_cannel.dispatch_on_tunnel_end(trace_id).await;

    result.map(|_| ())
}
