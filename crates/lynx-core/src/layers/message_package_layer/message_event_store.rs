use anyhow::Result;
use bytes::Bytes;
use dashmap::DashMap;
use dashmap::mapref::one::RefMut;
use http::Extensions;
use moka::future::Cache;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::sync::RwLock;
use utoipa::ToSchema;

use super::message_event_data::{
    MessageEventRequest, MessageEventResponse, MessageEventTunnel, MessageEventWebSocket,
    WebSocketLog,
};
use crate::layers::trace_id_layer::service::TraceId;

#[derive(Debug, Clone)]
pub enum MessageEvent {
    OnRequestStart(TraceId, MessageEventRequest),

    // it is None if the request body is end
    // it is Some if the request body is in progress
    OnRequestBody(TraceId, Option<Bytes>),

    OnRequestEnd(TraceId),

    OnResponseBody(TraceId, Option<Bytes>),

    OnProxyStart(TraceId),

    OnProxyEnd(TraceId),

    OnResponseStart(TraceId, MessageEventResponse),

    OnWebSocketStart(TraceId),

    OnWebSocketError(TraceId, String),

    OnWebSocketMessage(TraceId, WebSocketLog),

    OnTunnelStart(TraceId),
    OnTunnelEnd(TraceId),

    OnError(TraceId, String),
}

#[derive(Debug, Deserialize, ToSchema, Serialize, Clone, PartialEq)]
pub enum MessageEventStatus {
    // Initial state, request just created
    Initial,
    // Request processing has started
    RequestStarted,
    // Request-response fully completed
    Completed,
    // An error occurred
    Error(String),
    // Request was cancelled
    Cancelled,
}

impl Default for MessageEventStatus {
    fn default() -> Self {
        Self::Initial
    }
}

#[derive(Debug, Deserialize, ToSchema, Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct MessageEventTimings {
    // The time when the request was received
    pub request_start: Option<u64>,
    // The time when the request was sent to the server
    pub request_end: Option<u64>,

    // The time when the response was received from the server
    pub request_body_start: Option<u64>,
    // The time when the response was sent to the client
    pub request_body_end: Option<u64>,

    // The time when the response was sent to the client
    pub proxy_start: Option<u64>,
    // The time when the response was sent to the client
    pub proxy_end: Option<u64>,

    // The time when the request was sent to the server
    pub reponse_body_start: Option<u64>,
    // The time when the response was sent to the client
    pub reponse_body_end: Option<u64>,

    pub tunnel_start: Option<u64>,
    pub tunnel_end: Option<u64>,

    pub websocket_start: Option<u64>,
    pub websocket_end: Option<u64>,
}

impl MessageEventTimings {
    fn now() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64
    }

    pub fn set_request_start(&mut self) {
        self.request_start = Some(Self::now());
    }

    pub fn set_request_end(&mut self) {
        self.request_end = Some(Self::now());
    }

    pub fn set_tunnel_start(&mut self) {
        self.tunnel_start = Some(Self::now());
    }
    pub fn set_tunnel_end(&mut self) {
        self.tunnel_end = Some(Self::now());
    }

    pub fn set_websocket_start(&mut self) {
        self.websocket_start = Some(Self::now());
    }
    pub fn set_websocket_end(&mut self) {
        self.websocket_end = Some(Self::now());
    }

    pub fn set_request_body_start(&mut self) {
        self.request_body_start = Some(Self::now());
    }

    pub fn set_request_body_end(&mut self) {
        self.request_body_end = Some(Self::now());
    }

    pub fn set_proxy_start(&mut self) {
        self.proxy_start = Some(Self::now());
    }

    pub fn set_proxy_end(&mut self) {
        self.proxy_end = Some(Self::now());
    }

    pub fn set_response_body_start(&mut self) {
        self.reponse_body_start = Some(Self::now());
    }

    pub fn set_response_body_end(&mut self) {
        self.reponse_body_end = Some(Self::now());
    }

    // Get durations for different phases
    pub fn get_total_time(&self) -> Option<u64> {
        match (self.request_start, self.proxy_end) {
            (Some(start), Some(end)) => Some(end - start),
            _ => None,
        }
    }

    pub fn get_request_time(&self) -> Option<u64> {
        match (self.request_start, self.request_end) {
            (Some(start), Some(end)) => Some(end - start),
            _ => None,
        }
    }

    pub fn get_response_time(&self) -> Option<u64> {
        match (self.proxy_start, self.proxy_end) {
            (Some(start), Some(end)) => Some(end - start),
            _ => None,
        }
    }
}

#[derive(Debug, Deserialize, ToSchema, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MessageEventStoreValue {
    pub status: MessageEventStatus,
    pub trace_id: String,
    pub is_new: bool,
    pub request: Option<MessageEventRequest>,
    pub response: Option<MessageEventResponse>,
    pub messages: Option<MessageEventWebSocket>,
    pub tunnel: Option<MessageEventTunnel>,
    pub timings: MessageEventTimings,
}

impl MessageEventStoreValue {
    pub fn new(trace_id: TraceId) -> Self {
        Self {
            status: MessageEventStatus::Initial,
            trace_id: trace_id.to_string(),
            is_new: true,
            request: None,
            response: None,
            messages: None,
            tunnel: None,
            timings: MessageEventTimings::default(),
        }
    }

    pub fn messages_mut(&mut self) -> &mut Option<MessageEventWebSocket> {
        &mut self.messages
    }
    pub fn request_mut(&mut self) -> &mut Option<MessageEventRequest> {
        &mut self.request
    }

    pub fn timings_mut(&mut self) -> &mut MessageEventTimings {
        &mut self.timings
    }

    pub fn response_mut(&mut self) -> &mut Option<MessageEventResponse> {
        &mut self.response
    }

    pub fn set_request(&mut self, request: MessageEventRequest) {
        self.request = Some(request);
    }

    pub fn set_response(&mut self, response: MessageEventResponse) {
        self.response = Some(response);
    }

    pub fn set_status(&mut self, status: MessageEventStatus) {
        self.status = status;
    }

    pub fn get_status(&self) -> &MessageEventStatus {
        &self.status
    }

    pub fn mark_as_cancelled(&mut self) {
        self.status = MessageEventStatus::Cancelled;
    }

    pub fn is_completed(&self) -> bool {
        matches!(self.status, MessageEventStatus::Completed)
    }

    pub fn is_error(&self) -> bool {
        matches!(self.status, MessageEventStatus::Error(_))
    }

    pub fn is_cancelled(&self) -> bool {
        matches!(self.status, MessageEventStatus::Cancelled)
    }
}

#[derive(Debug, Clone)]
pub struct MessageEventCache {
    moka: Arc<Cache<TraceId, ()>>,
    map: Arc<DashMap<TraceId, MessageEventStoreValue>>,
}

impl From<MessageEventStoreValue> for CacheValue {
    fn from(value: MessageEventStoreValue) -> Self {
        Arc::new(RwLock::new(value))
    }
}

type CacheValue = Arc<RwLock<MessageEventStoreValue>>;

impl MessageEventCache {
    pub fn new(max_capacity: u64) -> Self {
        let map = Arc::new(DashMap::new());
        let map_clone = map.clone();

        let moka = Cache::builder()
            .max_capacity(max_capacity)
            .eviction_listener(move |k, _, _| {
                // 淘汰时移除 DashMap
                map_clone.remove(&*k);
            })
            .build();
        Self {
            moka: Arc::new(moka),
            map,
        }
    }

    pub async fn insert(&self, key: TraceId, value: MessageEventStoreValue) {
        self.map.insert(key.clone(), value);
        self.moka.insert(key, ()).await;
    }

    pub fn get(&self, key: &TraceId) -> Option<MessageEventStoreValue> {
        self.map.get(key).map(|v| v.clone())
    }

    pub fn get_mut(&self, key: &TraceId) -> Option<RefMut<TraceId, MessageEventStoreValue>> {
        self.map.get_mut(key)
    }

    pub async fn get_new_requests(&self) -> Result<Vec<MessageEventStoreValue>> {
        let mut new_requests = Vec::new();

        for mut entry in self.map.iter_mut() {
            if entry.is_new {
                // 收集副本
                new_requests.push(entry.clone());
                // 标记为已处理
                entry.is_new = false;
            }
        }

        Ok(new_requests)
    }

    pub async fn get_request_by_keys(&self, keys: Vec<String>) -> Vec<MessageEventStoreValue> {
        let mut requests = Vec::new();

        for key in keys {
            if let Some(entry) = self.map.get(&key) {
                let value = entry.value();
                let filter_flag = value.is_new
                    || value.is_completed()
                    || value.is_error()
                    || value.is_cancelled();

                if filter_flag {
                    requests.push(value.clone());
                }
            }
        }
        requests
    }
}

impl Default for MessageEventCache {
    fn default() -> Self {
        Self::new(10_000) // Default cache capacity is 10000
    }
}

pub trait MessageEventStoreExtensionsExt {
    fn get_message_event_store(&self) -> Arc<MessageEventCache>;
}

impl MessageEventStoreExtensionsExt for Extensions {
    fn get_message_event_store(&self) -> Arc<MessageEventCache> {
        self.get::<Arc<MessageEventCache>>()
            .expect("MessageEventStore not found in Extensions")
            .clone()
    }
}
