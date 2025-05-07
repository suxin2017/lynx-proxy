use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub enum MessageEvent {
    OnRequestStart,

    OnProxyStart,

    OnProxyEnd,

    OnRequestEnd,

    OnError,
}
