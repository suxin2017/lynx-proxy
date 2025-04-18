use core::fmt;
use std::task::{Context, Poll, ready};

use pin_project_lite::pin_project;
use tower::{Layer, Service};

use crate::common::HyperReq;

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
