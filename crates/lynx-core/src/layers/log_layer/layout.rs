use core::fmt;
use std::task::{Context, Poll, ready};

use pin_project_lite::pin_project;
use tower::{Layer, Service};

use crate::common::HyperReq;

use super::LogService;

pub struct LogLayer {}

impl<S> Layer<S> for LogLayer {
    type Service = LogService<S>;

    fn layer(&self, service: S) -> Self::Service {
        LogService { service }
    }
}
