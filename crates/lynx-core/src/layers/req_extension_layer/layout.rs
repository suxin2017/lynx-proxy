use tower::Layer;

use super::RequestExtensionService;

#[derive(Debug, Clone, Copy)]
pub struct RequestExtensionLayer<V> {
    value: V,
}

impl<V> RequestExtensionLayer<V> {
    pub fn new(value: V) -> Self {
        RequestExtensionLayer { value }
    }
}

impl<S, V: Clone> Layer<S> for RequestExtensionLayer<V> {
    type Service = RequestExtensionService<S, V>;

    fn layer(&self, service: S) -> Self::Service {
        RequestExtensionService {
            service,
            value: self.value.clone(),
        }
    }
}
