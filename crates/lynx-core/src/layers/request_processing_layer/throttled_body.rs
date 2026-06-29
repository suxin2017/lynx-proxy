use bytes::Bytes;
use http_body::{Body, Frame, SizeHint};
use pin_project_lite::pin_project;
use std::{
    pin::Pin,
    task::{Context, Poll},
};
use tokio::time::{Duration, Sleep};

pin_project! {
    pub struct ThrottledBody<B> {
        #[pin]
        inner: B,
        bytes_per_sec: u64,
        #[pin]
        delay: Option<Pin<Box<Sleep>>>,
        pending: Option<Frame<Bytes>>,
    }
}

impl<B> ThrottledBody<B> {
    /// `kbps` is kilobits per second; `0` means no throttling.
    pub fn new(inner: B, kbps: u64) -> Self {
        let bytes_per_sec = if kbps == 0 {
            0
        } else {
            kbps.saturating_mul(1000) / 8
        };
        Self {
            inner,
            bytes_per_sec,
            delay: None,
            pending: None,
        }
    }

    fn delay_for_chunk(bytes_per_sec: u64, chunk_len: usize) -> Option<Duration> {
        if bytes_per_sec == 0 || chunk_len == 0 {
            return None;
        }
        let delay_ms = (chunk_len as u64)
            .saturating_mul(1000)
            .saturating_div(bytes_per_sec);
        if delay_ms == 0 {
            None
        } else {
            Some(Duration::from_millis(delay_ms))
        }
    }
}

impl<B> Body for ThrottledBody<B>
where
    B: Body<Data = Bytes, Error = anyhow::Error>,
{
    type Data = Bytes;
    type Error = anyhow::Error;

    fn poll_frame(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
    ) -> Poll<Option<Result<Frame<Self::Data>, Self::Error>>> {
        loop {
            if let Some(delay) = self.as_mut().project().delay.as_mut().as_pin_mut() {
                if delay.poll(cx).is_pending() {
                    return Poll::Pending;
                }
                self.as_mut().project().delay.set(None);
                return Poll::Ready(Some(Ok(self
                    .as_mut()
                    .project()
                    .pending
                    .take()
                    .expect("pending frame after delay"))));
            }

            match self.as_mut().project().inner.poll_frame(cx) {
                Poll::Ready(Some(Ok(frame))) => {
                    if let Some(chunk) = frame.data_ref()
                        && let Some(duration) = Self::delay_for_chunk(
                            *self.as_mut().project().bytes_per_sec,
                            chunk.len(),
                        )
                    {
                        self.as_mut().project().pending.replace(frame);
                        self.as_mut()
                            .project()
                            .delay
                            .set(Some(Box::pin(tokio::time::sleep(duration))));
                        continue;
                    }
                    return Poll::Ready(Some(Ok(frame)));
                }
                other => return other,
            }
        }
    }

    fn is_end_stream(&self) -> bool {
        self.inner.is_end_stream() && self.delay.is_none() && self.pending.is_none()
    }

    fn size_hint(&self) -> SizeHint {
        self.inner.size_hint()
    }
}
