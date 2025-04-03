// adapted from https://github.com/hyperium/hyper/blob/master/src/common/io/rewind.rs

use bytes::{Buf, Bytes};
use hyper::upgrade::Upgraded;
use hyper_util::rt::TokioIo;
use std::{
    cmp, io,
    marker::Unpin,
    pin::Pin,
    task::{self, Poll},
};
use tokio::io::{AsyncRead, AsyncReadExt, AsyncWrite, ReadBuf};

/// Combine a buffer with an IO, rewinding reads to use the buffer.
#[derive(Debug)]
pub(crate) struct Rewind {
    pre: Option<Bytes>,
    inner: TokioIo<Upgraded>,
}

impl Rewind {
    pub(crate) async fn new(mut io: TokioIo<Upgraded>) -> (Self, bool, bool) {
        let mut buffer = [0; 4];
        let bytes_read = match io.read_exact(&mut buffer).await {
            Ok(bytes_read) => Some(bytes_read),
            Err(err) => {
                // If we get an error, we need to return the error
                // and not the buffer.
                tracing::error!("Error reading from io: {:?}", err);
                None
            }
        };
        let is_websocket = buffer == *b"GET ";
        let is_https = buffer[..2] == *b"\x16\x03";
        (
            Rewind {
                pre: bytes_read.and_then(|bytes_read| {
                    if bytes_read == 0 {
                        None
                    } else {
                        Some(Bytes::copy_from_slice(&buffer[..bytes_read]))
                    }
                }),
                inner: io,
            },
            is_websocket,
            is_https,
        )
    }
}

impl AsyncRead for Rewind {
    fn poll_read(
        mut self: Pin<&mut Self>,
        cx: &mut task::Context<'_>,
        buf: &mut ReadBuf<'_>,
    ) -> Poll<io::Result<()>> {
        if let Some(mut prefix) = self.pre.take() {
            // If there are no remaining bytes, let the bytes get dropped.
            if !prefix.is_empty() {
                let copy_len = cmp::min(prefix.len(), buf.remaining());
                // TODO: There should be a way to do following two lines cleaner...
                buf.put_slice(&prefix[..copy_len]);
                prefix.advance(copy_len);
                // Put back whats left
                if !prefix.is_empty() {
                    self.pre = Some(prefix);
                }

                return Poll::Ready(Ok(()));
            }
        }
        Pin::new(&mut self.inner).poll_read(cx, buf)
    }
}

impl AsyncWrite for Rewind {
    fn poll_write(
        mut self: Pin<&mut Self>,
        cx: &mut task::Context<'_>,
        buf: &[u8],
    ) -> Poll<io::Result<usize>> {
        Pin::new(&mut self.inner).poll_write(cx, buf)
    }

    fn poll_write_vectored(
        mut self: Pin<&mut Self>,
        cx: &mut task::Context<'_>,
        buf: &[io::IoSlice<'_>],
    ) -> Poll<io::Result<usize>> {
        Pin::new(&mut self.inner).poll_write_vectored(cx, buf)
    }

    fn poll_flush(mut self: Pin<&mut Self>, cx: &mut task::Context<'_>) -> Poll<io::Result<()>> {
        Pin::new(&mut self.inner).poll_flush(cx)
    }

    fn poll_shutdown(mut self: Pin<&mut Self>, cx: &mut task::Context<'_>) -> Poll<io::Result<()>> {
        Pin::new(&mut self.inner).poll_shutdown(cx)
    }

    fn is_write_vectored(&self) -> bool {
        self.inner.is_write_vectored()
    }
}
