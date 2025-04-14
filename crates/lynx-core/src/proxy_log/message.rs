use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::{entities::request::Model, proxy::websocket_proxy::WebSocketLog};

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum MessageLog {
    Request(Model),
    WebSocket(WebSocketLog),
}

impl MessageLog {
    pub fn request_log(log: Model) -> Self {
        MessageLog::Request(log)
    }
    pub fn websocket_log(log: WebSocketLog) -> Self {
        MessageLog::WebSocket(log)
    }
}
