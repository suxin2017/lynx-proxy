use tower::Layer;

use super::TraceIdService;

#[derive(Debug, Clone, Copy)]
pub struct TraceIdLayer;

impl<S> Layer<S> for TraceIdLayer {
    type Service = TraceIdService<S>;

    fn layer(&self, service: S) -> Self::Service {
        TraceIdService { service }
    }
}
