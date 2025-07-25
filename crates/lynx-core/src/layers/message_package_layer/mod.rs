use std::sync::Arc;

use http::Extensions;

use crate::proxy::proxy_ws_request::SendType;
use crate::common::{Req, Res};

use super::trace_id_layer::service::TraceId;

pub mod message_event_data;
pub mod message_event_store;
pub mod compression;
pub mod event_handler;
pub mod channel;
pub mod services;

// 重新导出主要类型
pub use channel::MessageEventChannel;
pub use services::{MessageEventLayerExt, RequestMessageEventService, ProxyMessageEventService};
