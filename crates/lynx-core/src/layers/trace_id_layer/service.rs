use std::{
    sync::Arc,
    task::{Context, Poll},
};

use http::{Extensions, Request, Response};
use nanoid::nanoid;
use tower::Service;

#[derive(Debug, Clone)]
pub struct TraceIdService<S> {
    pub service: S,
}

type TraceId = Arc<String>;

impl<S, Body> Service<Request<Body>> for TraceIdService<S>
where
    S: Service<Request<Body>>,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = S::Future;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.service.poll_ready(cx)
    }

    fn call(&mut self, mut request: Request<Body>) -> Self::Future {
        request.extensions_mut().insert(Arc::new(nanoid!()));
        self.service.call(request)
    }
}

pub trait TraceIdExt {
    fn get_trace_id(&self) -> Option<TraceId>;
}

impl TraceIdExt for Extensions {
    fn get_trace_id(&self) -> Option<TraceId> {
        self.get::<TraceId>().cloned()
    }
}

#[cfg(test)]
mod tests {
    use anyhow::{Ok, Result};

    use super::*;

    #[test]
    fn get_trace_id_test() -> Result<()> {
        let mut req = Request::builder().body(())?;
        req.extensions_mut().insert(Arc::new(nanoid!()));
        let trace_id = req.extensions().get_trace_id();
        assert!(trace_id.is_some());

        Ok(())
    }
}
