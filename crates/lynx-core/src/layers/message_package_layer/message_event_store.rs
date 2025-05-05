use serde::{Deserialize, Serialize};


#[derive(Debug, Deserialize, Serialize)]
pub enum MessageEvent {
    OnRequestStart,

    OnRequestEnd,

    OnRequestBodyStart,

    OnRequestBodyEnd,

    OnResponseStart,

    OnResponseEnd,

    OnResponseBodyStart,

    OnResponseBodyEnd,

    OnError,
}