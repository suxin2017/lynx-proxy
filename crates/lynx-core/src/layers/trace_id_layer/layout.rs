use core::fmt;
use std::task::{Context, Poll, ready};

use pin_project_lite::pin_project;
use tower::{Layer, Service};

use crate::common::HyperReq;

use super::TraceIdService;

#[derive(Debug, Clone, Copy)]
pub struct TraceIdLayer;

impl<S> Layer<S> for TraceIdLayer {
    type Service = TraceIdService<S>;

    fn layer(&self, service: S) -> Self::Service {
        TraceIdService { service }
    }
}
