use anyhow::Result;
use bytes::Bytes;
use dashmap::DashMap;
use dashmap::mapref::one::RefMut;
use http::Extensions;
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

    pub fn is_need_delteed(&self) -> bool {
        self.is_completed() || self.is_error() || self.is_cancelled()
    }
}

#[derive(Debug, Clone)]
pub struct MessageEventCache {
    map: Arc<DashMap<TraceId, MessageEventStoreValue>>,
}

impl From<MessageEventStoreValue> for CacheValue {
    fn from(value: MessageEventStoreValue) -> Self {
        Arc::new(RwLock::new(value))
    }
}

type CacheValue = Arc<RwLock<MessageEventStoreValue>>;

impl MessageEventCache {
    pub fn new() -> Self {
        let map = Arc::new(DashMap::new());

        Self { map }
    }

    fn remove_oldest_completed(&self) {
        if self.map.len() > 30 {
            let oldest_key = {
                self.map
                    .iter()
                    .find(|r| r.is_completed())
                    .map(|r| r.key().clone())
            };

            if let Some(key) = oldest_key {
                self.map.remove(&key);
            }
        }
    }

    pub async fn insert(&self, key: TraceId, value: MessageEventStoreValue) {
        self.map.insert(key.clone(), value);
        self.remove_oldest_completed();
    }

    pub fn get(&self, key: &TraceId) -> Option<MessageEventStoreValue> {
        self.map.get(key).map(|v| v.clone())
    }

    pub fn get_mut(&self, key: &TraceId) -> Option<RefMut<TraceId, MessageEventStoreValue>> {
        self.map.get_mut(key)
    }

    pub fn need_decode_body(value: &MessageEventStoreValue) -> bool {
        value.timings.reponse_body_end.is_some() && value.status == MessageEventStatus::Completed
    }

    pub async fn get_new_requests(&self) -> Result<Vec<MessageEventStoreValue>> {
        let mut new_requests = Vec::new();
        let mut delete_keys: Vec<TraceId> = Vec::new();

        for mut entry in self.map.iter_mut() {
            if entry.is_new {
                let value = entry.clone();
                if value.is_need_delteed() {
                    delete_keys.push(value.trace_id.clone().into());
                }
                new_requests.push(value);
                entry.is_new = false;
            }
        }

        for key in delete_keys {
            self.map.remove(&key);
        }

        Ok(new_requests)
    }

    pub async fn get_request_by_keys(
        &self,
        keys: Vec<String>,
    ) -> Result<Vec<MessageEventStoreValue>> {
        let mut requests = Vec::new();
        let mut delete_keys: Vec<TraceId> = Vec::new();

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
                if value.is_need_delteed() {
                    delete_keys.push(key.into());
                }
            }
        }

        for key in delete_keys {
            self.map.remove(&key);
        }
        Ok(requests)
    }
}

impl Default for MessageEventCache {
    fn default() -> Self {
        Self::new()
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
