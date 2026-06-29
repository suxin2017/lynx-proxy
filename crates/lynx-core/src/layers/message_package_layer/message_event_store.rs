use anyhow::Result;
use bytes::Bytes;
use dashmap::DashMap;
use dashmap::mapref::one::RefMut;
use http::Extensions;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::sync::RwLock;

use super::message_event_data::{
    MessageEventRequest, MessageEventResponse, MessageEventTunnel, MessageEventWebSocket,
    TunnelStatus, WebSocketLog, WebSocketStatus,
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

    OnWebSocketEnd(TraceId),

    OnWebSocketError(TraceId, String),

    OnWebSocketMessage(TraceId, WebSocketLog),

    OnTunnelStart(TraceId),
    OnTunnelEnd(TraceId),

    OnError(TraceId, String),
}

#[derive(Debug, Deserialize, Serialize, Clone, PartialEq, Default)]
pub enum MessageEventStatus {
    // Initial state, request just created
    #[default]
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

#[derive(Debug, Deserialize, Serialize, Clone, Default)]
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

#[derive(Debug, Deserialize, Serialize, Clone)]
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
    /// Timestamp (ms since epoch) when this entry reached a terminal state.
    #[serde(skip)]
    pub completed_at: Option<u64>,
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
            completed_at: None,
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

    pub(crate) fn mark_completed_at(&mut self) {
        if self.completed_at.is_none() {
            self.completed_at = Some(
                SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap()
                    .as_millis() as u64,
            );
        }
    }

    pub fn get_status(&self) -> &MessageEventStatus {
        &self.status
    }

    pub fn mark_as_cancelled(&mut self) {
        self.status = MessageEventStatus::Cancelled;
        self.mark_completed_at();
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
        // Never delete while a long connection is still active.
        if self.has_active_long_connection() {
            return false;
        }
        // Delete terminal entries.
        if self.is_completed() || self.is_error() || self.is_cancelled() {
            return true;
        }
        // Safety net: evict entries that have been in a non-terminal state for
        // more than 10 minutes (e.g. stalled requests where events were lost).
        const MAX_PENDING_AGE_MS: u64 = 10 * 60 * 1_000;
        if let Some(at) = self.completed_at {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64;
            if now.saturating_sub(at) > MAX_PENDING_AGE_MS {
                return true;
            }
        }
        false
    }

    fn has_active_long_connection(&self) -> bool {
        if self
            .tunnel
            .as_ref()
            .is_some_and(|t| t.status == TunnelStatus::Connected)
        {
            return true;
        }
        if self.messages.as_ref().is_some_and(|ws| {
            matches!(
                ws.status,
                WebSocketStatus::Start | WebSocketStatus::Connected
            )
        }) {
            return true;
        }
        false
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

    pub fn clear(&self) {
        self.map.clear();
    }

    fn remove_oldest_completed(&self) {
        const EVICT_THRESHOLD: usize = 10;
        const MAX_COMPLETED_AGE_MS: u64 = 10 * 60 * 1_000; // 10 minutes

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        // Always evict completed entries that have exceeded the TTL.
        let expired_keys: Vec<TraceId> = self
            .map
            .iter()
            .filter(|r| {
                r.is_need_delteed()
                    && r.completed_at
                        .is_some_and(|at| now.saturating_sub(at) > MAX_COMPLETED_AGE_MS)
            })
            .map(|r| r.key().clone())
            .collect();
        for key in expired_keys {
            self.map.remove(&key);
        }

        // If still above threshold, evict the oldest completed entry.
        if self.map.len() > EVICT_THRESHOLD {
            let oldest_key = self
                .map
                .iter()
                .filter(|r| r.is_need_delteed())
                .min_by_key(|r| r.completed_at.unwrap_or(u64::MAX))
                .map(|r| r.key().clone());

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

    pub fn get_mut(&self, key: &TraceId) -> Option<RefMut<'_, TraceId, MessageEventStoreValue>> {
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

#[cfg(test)]
mod tests {
    use std::sync::Arc;
    use std::time::{SystemTime, UNIX_EPOCH};

    use super::*;

    fn now_ms() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock should be monotonic")
            .as_millis() as u64
    }

    fn completed_value(trace_id: &TraceId, completed_at: u64) -> MessageEventStoreValue {
        let mut value = MessageEventStoreValue::new(trace_id.clone());
        value.status = MessageEventStatus::Completed;
        value.completed_at = Some(completed_at);
        value
    }

    #[tokio::test]
    async fn evicts_completed_entry_when_ttl_expired() {
        let cache = MessageEventCache::new();
        let id: TraceId = Arc::new("expired-entry".to_string());
        let expired_at = now_ms() - (11 * 60 * 1_000);

        cache
            .insert(id.clone(), completed_value(&id, expired_at))
            .await;

        assert!(
            cache.get(&id).is_none(),
            "expired completed entry should be evicted"
        );
    }

    #[tokio::test]
    async fn keeps_active_websocket_entry_even_with_old_completed_at() {
        let cache = MessageEventCache::new();
        let active_id: TraceId = Arc::new("active-websocket".to_string());
        let fresh_id: TraceId = Arc::new("fresh-completed".to_string());

        let mut active = completed_value(&active_id, now_ms() - (11 * 60 * 1_000));
        active.messages = Some(MessageEventWebSocket {
            status: WebSocketStatus::Connected,
            message: vec![],
        });

        cache.insert(active_id.clone(), active).await;
        cache
            .insert(fresh_id.clone(), completed_value(&fresh_id, now_ms()))
            .await;

        assert!(
            cache.get(&active_id).is_some(),
            "active websocket entries must not be evicted"
        );
        assert!(cache.get(&fresh_id).is_some());
    }

    #[tokio::test]
    async fn threshold_eviction_removes_oldest_completed_entry() {
        let cache = MessageEventCache::new();
        let base = now_ms();
        let mut ids: Vec<TraceId> = Vec::new();

        for i in 0..11 {
            let id: TraceId = Arc::new(format!("completed-{i}"));
            ids.push(id.clone());
            cache
                .insert(id.clone(), completed_value(&id, base + i as u64))
                .await;
        }

        assert!(
            cache.get(&ids[0]).is_none(),
            "oldest completed entry should be evicted when threshold is exceeded"
        );
        assert!(cache.get(&ids[10]).is_some());
    }
}
