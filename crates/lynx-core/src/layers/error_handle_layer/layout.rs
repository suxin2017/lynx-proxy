use tower::Layer;

use super::ErrorHandlerService;

pub struct ErrorHandlerLayer;

impl<S> Layer<S> for ErrorHandlerLayer {
    type Service = ErrorHandlerService<S>;

    fn layer(&self, service: S) -> Self::Service {
        ErrorHandlerService { service }
    }
}
