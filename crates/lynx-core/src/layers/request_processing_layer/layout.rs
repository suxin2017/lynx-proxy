use tower::Layer;

use super::service::RequestProcessingService;

pub struct RequestProcessingLayer;

impl<S> Layer<S> for RequestProcessingLayer {
    type Service = RequestProcessingService<S>;

    fn layer(&self, service: S) -> Self::Service {
        RequestProcessingService::new(service)
    }
}
