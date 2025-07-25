use anyhow::Result;
use std::sync::Arc;
use tracing::warn;

use super::message_event_data::{
    MessageEventTunnel, MessageEventWebSocket, TunnelStatus, WebSocketStatus,
};
use super::message_event_store::{MessageEvent, MessageEventStoreValue, MessageEventTimings};

/// 处理单个消息事件
pub async fn handle_message_event_single(
    event: MessageEvent,
    cache: Arc<super::message_event_store::MessageEventCache>,
) -> Result<()> {
    match event {
        MessageEvent::OnRequestStart(id, req) => {
            let mut timings = MessageEventTimings::default();
            timings.set_request_start();

            let mut value = MessageEventStoreValue::new(id.clone());

            value.request = Some(req);
            value.timings = timings;
            value.status = super::message_event_store::MessageEventStatus::RequestStarted;

            cache.insert(id, value).await;
        }
        MessageEvent::OnRequestBody(id, data) => {
            let value = cache.get_mut(&id);
            if value.is_none() {
                return Ok(());
            }
            let mut value = value.unwrap();

            if let Some(data) = data {
                if let Some(req) = value.request_mut() {
                    req.body.extend(data);
                }
                value.timings_mut().set_request_body_start();
            } else {
                if value
                    .request
                    .as_ref()
                    .filter(|req| req.body.is_empty())
                    .is_some()
                {
                    value.timings_mut().set_request_body_start();
                }
                value.timings_mut().set_request_body_end()
            }
        }
        MessageEvent::OnRequestEnd(id) => {
            let value = cache.get_mut(&id);
            if value.is_none() {
                return Ok(());
            }
            let mut value = value.unwrap();
            value.timings_mut().set_request_end();
            value.status = super::message_event_store::MessageEventStatus::Completed;
        }
        MessageEvent::OnError(id, error_reason) => {
            let value = cache.get_mut(&id);
            if value.is_none() {
                return Ok(());
            }
            let mut value = value.unwrap();
            value.timings_mut().set_request_end();
            value.status = super::message_event_store::MessageEventStatus::Error(error_reason);
        }
        MessageEvent::OnResponseBody(id, data) => {
            let value = cache.get_mut(&id);
            if value.is_none() {
                return Ok(());
            }
            let mut value = value.unwrap();
            if let Some(data) = data {
                if let Some(req) = value.response_mut() {
                    req.body.extend(data);
                }
                value.timings_mut().set_response_body_start();
            } else {
                if value
                    .request
                    .as_ref()
                    .filter(|req| req.body.is_empty())
                    .is_some()
                {
                    value.timings_mut().set_response_body_start();
                }
                value.timings_mut().set_response_body_end()
            }
        }
        MessageEvent::OnProxyStart(id) => {
            let value = cache.get_mut(&id);
            if value.is_none() {
                return Ok(());
            }
            let mut value = value.unwrap();
            value.timings_mut().set_proxy_start();
        }
        MessageEvent::OnProxyEnd(id) => {
            let value = cache.get_mut(&id);
            if value.is_none() {
                return Ok(());
            }
            let mut value = value.unwrap();
            value.timings_mut().set_proxy_end();
        }
        MessageEvent::OnResponseStart(id, res) => {
            let value = cache.get_mut(&id);
            if value.is_none() {
                return Ok(());
            }
            let mut value = value.unwrap();
            value.response_mut().replace(res);
        }
        MessageEvent::OnWebSocketStart(id) => {
            let value = cache.get_mut(&id);
            if value.is_none() {
                return Ok(());
            }
            let mut value = value.unwrap();
            value.timings_mut().set_websocket_start();
            value.messages = Some(MessageEventWebSocket {
                ..Default::default()
            });
        }
        MessageEvent::OnWebSocketError(id, error_reason) => {
            let value = cache.get_mut(&id);
            if value.is_none() {
                return Ok(());
            }
            let mut value = value.unwrap();
            value.timings_mut().set_websocket_end();
            let msg = value.messages_mut();

            match msg {
                Some(msg) => {
                    msg.status = WebSocketStatus::Error(error_reason);
                }
                None => {
                    let msg = MessageEventWebSocket {
                        status: WebSocketStatus::Error(error_reason),
                        ..Default::default()
                    };
                    value.messages = Some(msg);
                }
            }
        }
        MessageEvent::OnWebSocketMessage(id, log) => {
            let value = cache.get_mut(&id);
            if value.is_none() {
                return Ok(());
            }
            let mut value = value.unwrap();
            let msg = value.messages_mut();

            match msg {
                Some(msg) => {
                    msg.status = WebSocketStatus::from(&log.message);
                    msg.message.push(log);
                }
                None => {
                    let mut msg = MessageEventWebSocket {
                        status: WebSocketStatus::from(&log.message),
                        ..Default::default()
                    };
                    msg.message.push(log);
                    value.messages = Some(msg);
                }
            }
        }
        MessageEvent::OnTunnelEnd(id) => {
            let value = cache.get_mut(&id);
            if value.is_none() {
                return Ok(());
            }
            let mut value = value.unwrap();

            value.timings_mut().set_tunnel_end();
            let msg = &mut value.tunnel;

            match msg {
                Some(msg) => msg.status = TunnelStatus::Disconnected,
                None => {
                    warn!("Tunnel not found for id: {}", id);
                }
            }
        }
        MessageEvent::OnTunnelStart(id) => {
            let value = cache.get_mut(&id);
            if value.is_none() {
                return Ok(());
            }
            let mut value = value.unwrap();
            value.timings_mut().set_tunnel_start();
            value.tunnel = Some(MessageEventTunnel {
                status: TunnelStatus::Connected,
            });
        }
    }
    Ok(())
}
