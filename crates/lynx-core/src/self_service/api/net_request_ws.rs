use std::time::{SystemTime, UNIX_EPOCH};

use axum::extract::State;
use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::response::IntoResponse;
use base64::{Engine as _, engine::general_purpose};
use futures_util::{SinkExt, StreamExt};
use lynx_storage::dao::net_request_dao::RecordingStatus;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use tokio::sync::broadcast;
use tracing::{debug, error, warn};
use axum::Router;
use axum::routing::get;
use lynx_storage::dao::general_setting_dao::{GeneralSetting, GeneralSettingDao};
use lynx_storage::dao::https_capture_dao::{CaptureFilter, HttpsCaptureDao};

use crate::layers::message_package_layer::message_event_store::MessageEvent;
use crate::self_service::api::generated::ws_v1::{WS_VERSION, frame_kind, op};
use crate::self_service::api::net_request_service;
use crate::self_service::RouteState;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WsErrorPayload {
    code: String,
    message: String,
    details: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WsFrame {
    version: String,
    kind: String,
    id: String,
    op: String,
    timestamp: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    payload: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<WsErrorPayload>,
}

fn now_millis() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

fn response_frame(id: String, op: String, payload: Value) -> WsFrame {
    WsFrame {
        version: WS_VERSION.to_string(),
        kind: "response".to_string(),
        id,
        op,
        timestamp: now_millis(),
        payload: Some(payload),
        error: None,
    }
}

fn event_frame(op: String, payload: Value) -> WsFrame {
    WsFrame {
        version: WS_VERSION.to_string(),
        kind: "event".to_string(),
        id: format!("evt-{}", now_millis()),
        op,
        timestamp: now_millis(),
        payload: Some(payload),
        error: None,
    }
}

fn error_frame(id: String, op: String, code: &str, message: &str, details: Option<Value>) -> WsFrame {
    WsFrame {
        version: WS_VERSION.to_string(),
        kind: "error".to_string(),
        id,
        op,
        timestamp: now_millis(),
        payload: None,
        error: Some(WsErrorPayload {
            code: code.to_string(),
            message: message.to_string(),
            details,
        }),
    }
}

fn pong_frame(id: String, op: String) -> WsFrame {
    WsFrame {
        version: WS_VERSION.to_string(),
        kind: "pong".to_string(),
        id,
        op,
        timestamp: now_millis(),
        payload: None,
        error: None,
    }
}

fn recording_status_to_text(status: &RecordingStatus) -> &'static str {
    match status {
        RecordingStatus::StartRecording => "recording",
        RecordingStatus::PauseRecording => "paused",
    }
}

fn parse_bool_payload(payload: &Option<Value>, key: &str) -> Option<bool> {
    payload
        .as_ref()
        .and_then(|value| value.get(key))
        .and_then(|value| value.as_bool())
}

fn parse_string_payload(payload: &Option<Value>, key: &str) -> Option<String> {
    payload
        .as_ref()
        .and_then(|value| value.get(key))
        .and_then(|value| value.as_str())
        .map(ToOwned::to_owned)
}

fn encode_optional_bytes(value: Option<bytes::Bytes>) -> Option<String> {
    value.map(|bytes| general_purpose::STANDARD.encode(bytes))
}

fn message_event_to_ws_event(event: MessageEvent) -> Option<WsFrame> {
    match event {
        MessageEvent::OnRequestStart(trace_id, req) => Some(event_frame(
            op::REQUEST_START.to_string(),
            json!({
                "traceId": trace_id.to_string(),
                "method": req.method,
                "url": req.url,
                "headers": req.headers,
                "version": req.version,
            }),
        )),
        MessageEvent::OnRequestBody(trace_id, body_data) => Some(event_frame(
            op::REQUEST_BODY.to_string(),
            json!({
                "traceId": trace_id.to_string(),
                "data": encode_optional_bytes(body_data),
            }),
        )),
        MessageEvent::OnRequestEnd(trace_id) => Some(event_frame(
            op::REQUEST_END.to_string(),
            json!({
                "traceId": trace_id.to_string(),
            }),
        )),
        MessageEvent::OnResponseStart(trace_id, res) => Some(event_frame(
            op::RESPONSE_START.to_string(),
            json!({
                "traceId": trace_id.to_string(),
                "status": res.status,
                "headers": res.headers,
                "version": res.version,
            }),
        )),
        MessageEvent::OnResponseBody(trace_id, body_data) => Some(event_frame(
            op::RESPONSE_BODY.to_string(),
            json!({
                "traceId": trace_id.to_string(),
                "data": encode_optional_bytes(body_data),
            }),
        )),
        MessageEvent::OnProxyEnd(trace_id) => Some(event_frame(
            op::RESPONSE_END.to_string(),
            json!({
                "traceId": trace_id.to_string(),
            }),
        )),
        MessageEvent::OnWebSocketMessage(trace_id, log) => Some(event_frame(
            op::WEBSOCKET_MESSAGE.to_string(),
            json!({
                "traceId": trace_id.to_string(),
                "log": log,
            }),
        )),
        MessageEvent::OnWebSocketError(trace_id, error_msg) => Some(event_frame(
            op::WEBSOCKET_ERROR.to_string(),
            json!({
                "traceId": trace_id.to_string(),
                "error": error_msg,
            }),
        )),
        MessageEvent::OnError(trace_id, error_msg) => Some(event_frame(
            op::SYSTEM_ERROR.to_string(),
            json!({
                "traceId": trace_id.to_string(),
                "error": error_msg,
            }),
        )),
        MessageEvent::OnProxyStart(_)
        | MessageEvent::OnTunnelStart(_)
        | MessageEvent::OnTunnelEnd(_)
        | MessageEvent::OnWebSocketStart(_) => {
            None
        }
    }
}

async fn send_frame(socket: &mut futures_util::stream::SplitSink<WebSocket, Message>, frame: WsFrame) {
    match serde_json::to_string(&frame) {
        Ok(payload) => {
            if let Err(err) = socket.send(Message::Text(payload.into())).await {
                warn!("Failed to send ws frame: {:?}", err);
            }
        }
        Err(err) => {
            warn!("Failed to serialize ws frame: {:?}", err);
        }
    }
}

async fn handle_client_request(
    frame: WsFrame,
    state: &RouteState,
    subscribed: &mut bool,
    socket_tx: &mut futures_util::stream::SplitSink<WebSocket, Message>,
) {
    if frame.version != WS_VERSION {
        send_frame(
            socket_tx,
            error_frame(
                frame.id,
                frame.op,
                "UNSUPPORTED_VERSION",
                "Only v1 protocol is supported",
                Some(json!({ "received": frame.version })),
            ),
        )
        .await;
        return;
    }

    if frame.kind == frame_kind::PING {
        send_frame(socket_tx, pong_frame(frame.id, frame.op)).await;
        return;
    }

    if frame.kind != frame_kind::REQUEST {
        send_frame(
            socket_tx,
            error_frame(
                frame.id,
                frame.op,
                "INVALID_FRAME_KIND",
                "Only request and ping frames are accepted from client",
                Some(json!({ "kind": frame.kind })),
            ),
        )
        .await;
        return;
    }

    if !op::is_request_op(frame.op.as_str()) {
        send_frame(
            socket_tx,
            error_frame(
                frame.id,
                frame.op,
                "UNSUPPORTED_OP",
                "Unsupported operation",
                None,
            ),
        )
        .await;
        return;
    }

    match frame.op.as_str() {
        op::SYSTEM_PING => {
            send_frame(socket_tx, pong_frame(frame.id, frame.op)).await;
        }
        op::CAPTURE_STATUS_GET => {
            match net_request_service::get_capture_status(state).await {
                Ok(status) => {
                    send_frame(
                        socket_tx,
                        response_frame(
                            frame.id,
                            frame.op,
                            json!({
                                "recordingStatus": recording_status_to_text(&status.recording_status),
                            }),
                        ),
                    )
                    .await;
                }
                Err(err) => {
                    send_frame(
                        socket_tx,
                        error_frame(
                            frame.id,
                            frame.op,
                            "DB_ERROR",
                            "Failed to get capture status",
                            Some(json!({ "reason": err.to_string() })),
                        ),
                    )
                    .await;
                }
            }
        }
        op::CAPTURE_CONTROL_SET => {
            let Some(recording) = parse_bool_payload(&frame.payload, "recording") else {
                send_frame(
                    socket_tx,
                    error_frame(
                        frame.id,
                        frame.op,
                        "INVALID_PAYLOAD",
                        "Missing boolean payload.recording",
                        None,
                    ),
                )
                .await;
                return;
            };

            match net_request_service::set_capture_recording(state, recording).await {
                Ok(new_status) => {
                    send_frame(socket_tx, response_frame(frame.id, frame.op, json!({ "ok": true }))).await;
                    send_frame(
                        socket_tx,
                        event_frame(
                            op::CAPTURE_STATUS_CHANGED.to_string(),
                            json!({
                                "recordingStatus": recording_status_to_text(&new_status.recording_status),
                            }),
                        ),
                    )
                    .await;
                }
                Err(err) => {
                    send_frame(
                        socket_tx,
                        error_frame(
                            frame.id,
                            frame.op,
                            "DB_ERROR",
                            "Failed to update capture status",
                            Some(json!({ "reason": err.to_string() })),
                        ),
                    )
                    .await;
                }
            }
        }
        op::REQUEST_DETAIL_GET => {
            let Some(trace_id) = parse_string_payload(&frame.payload, "traceId") else {
                send_frame(
                    socket_tx,
                    error_frame(
                        frame.id,
                        frame.op,
                        "INVALID_PAYLOAD",
                        "Missing payload.traceId",
                        None,
                    ),
                )
                .await;
                return;
            };

            match net_request_service::get_request_detail(state, trace_id.clone()).await {
                Ok(detail) => {
                    send_frame(
                        socket_tx,
                        response_frame(
                            frame.id,
                            frame.op,
                            json!({
                                "traceId": trace_id,
                                "detail": detail,
                            }),
                        ),
                    )
                    .await;
                }
                Err(err) => {
                    send_frame(
                        socket_tx,
                        error_frame(
                            frame.id,
                            frame.op,
                            "REQUEST_DETAIL_ERROR",
                            "Failed to get request detail",
                            Some(json!({ "reason": err.to_string() })),
                        ),
                    )
                    .await;
                }
            }
        }
        op::REQUEST_STREAM_SUBSCRIBE => {
            *subscribed = true;

            let cached_requests = match net_request_service::get_cached_requests(state, Vec::new()).await {
                Ok(records) => records,
                Err(err) => {
                    send_frame(
                        socket_tx,
                        error_frame(
                            frame.id,
                            frame.op,
                            "CACHE_ERROR",
                            "Failed to get cached requests",
                            Some(json!({ "reason": err.to_string() })),
                        ),
                    )
                    .await;
                    return;
                }
            };

            send_frame(
                socket_tx,
                response_frame(
                    frame.id,
                    frame.op,
                    json!({
                        "subscribed": true,
                        "cachedRequests": cached_requests,
                    }),
                ),
            )
            .await;
        }
        op::REQUEST_STREAM_UNSUBSCRIBE => {
            *subscribed = false;
            send_frame(socket_tx, response_frame(frame.id, frame.op, json!({ "subscribed": false }))).await;
        }
        op::SETTINGS_GENERAL_GET => {
            let dao = GeneralSettingDao::new(state.store.clone());
            match dao.get_general_setting().await {
                Ok(setting) => {
                    send_frame(
                        socket_tx,
                        response_frame(frame.id, frame.op, serde_json::to_value(setting).unwrap_or_default()),
                    )
                    .await;
                }
                Err(err) => {
                    send_frame(
                        socket_tx,
                        error_frame(
                            frame.id,
                            frame.op,
                            "DB_ERROR",
                            "Failed to get general setting",
                            Some(json!({ "reason": err.to_string() })),
                        ),
                    )
                    .await;
                }
            }
        }
        op::SETTINGS_GENERAL_SET => {
            let Some(payload) = frame.payload.clone() else {
                send_frame(
                    socket_tx,
                    error_frame(
                        frame.id,
                        frame.op,
                        "INVALID_PAYLOAD",
                        "Missing settings payload",
                        None,
                    ),
                )
                .await;
                return;
            };

            match serde_json::from_value::<GeneralSetting>(payload) {
                Ok(setting) => {
                    let dao = GeneralSettingDao::new(state.store.clone());
                    match dao.update_general_setting(setting).await {
                        Ok(()) => {
                            send_frame(socket_tx, response_frame(frame.id, frame.op, json!({ "ok": true }))).await;
                        }
                        Err(err) => {
                            send_frame(
                                socket_tx,
                                error_frame(
                                    frame.id,
                                    frame.op,
                                    "DB_ERROR",
                                    "Failed to update general setting",
                                    Some(json!({ "reason": err.to_string() })),
                                ),
                            )
                            .await;
                        }
                    }
                }
                Err(err) => {
                    send_frame(
                        socket_tx,
                        error_frame(
                            frame.id,
                            frame.op,
                            "INVALID_PAYLOAD",
                            "Failed to parse general setting",
                            Some(json!({ "reason": err.to_string() })),
                        ),
                    )
                    .await;
                }
            }
        }
        op::SETTINGS_CAPTURE_FILTER_GET => {
            let dao = HttpsCaptureDao::new(state.store.clone());
            match dao.get_capture_filter().await {
                Ok(filter) => {
                    send_frame(
                        socket_tx,
                        response_frame(frame.id, frame.op, serde_json::to_value(filter).unwrap_or_default()),
                    )
                    .await;
                }
                Err(err) => {
                    send_frame(
                        socket_tx,
                        error_frame(
                            frame.id,
                            frame.op,
                            "DB_ERROR",
                            "Failed to get capture filter",
                            Some(json!({ "reason": err.to_string() })),
                        ),
                    )
                    .await;
                }
            }
        }
        op::SETTINGS_CAPTURE_FILTER_SET => {
            let Some(payload) = frame.payload.clone() else {
                send_frame(
                    socket_tx,
                    error_frame(
                        frame.id,
                        frame.op,
                        "INVALID_PAYLOAD",
                        "Missing capture filter payload",
                        None,
                    ),
                )
                .await;
                return;
            };

            match serde_json::from_value::<CaptureFilter>(payload) {
                Ok(filter) => {
                    let dao = HttpsCaptureDao::new(state.store.clone());
                    match dao.update_capture_filter(filter).await {
                        Ok(()) => {
                            send_frame(socket_tx, response_frame(frame.id, frame.op, json!({ "ok": true }))).await;
                        }
                        Err(err) => {
                            send_frame(
                                socket_tx,
                                error_frame(
                                    frame.id,
                                    frame.op,
                                    "DB_ERROR",
                                    "Failed to update capture filter",
                                    Some(json!({ "reason": err.to_string() })),
                                ),
                            )
                            .await;
                        }
                    }
                }
                Err(err) => {
                    send_frame(
                        socket_tx,
                        error_frame(
                            frame.id,
                            frame.op,
                            "INVALID_PAYLOAD",
                            "Failed to parse capture filter",
                            Some(json!({ "reason": err.to_string() })),
                        ),
                    )
                    .await;
                }
            }
        }
        op::SETTINGS_CERTIFICATE_PATH_GET => {
            send_frame(
                socket_tx,
                response_frame(
                    frame.id,
                    frame.op,
                    json!({
                        "path": state.proxy_config.root_cert_file_path.to_string_lossy(),
                    }),
                ),
            )
            .await;
        }
        _ => {
            // covered by pre-validation above
        }
    }
}

async fn message_events_ws_handler(socket: WebSocket, state: RouteState) {
    let (mut socket_tx, mut socket_rx) = socket.split();
    let mut event_rx = state.message_event_channel.subscribe();
    let mut subscribed = false;

    loop {
        tokio::select! {
            recv_result = socket_rx.next() => {
                match recv_result {
                    Some(Ok(Message::Text(text))) => {
                        match serde_json::from_str::<WsFrame>(&text) {
                            Ok(frame) => {
                                handle_client_request(frame, &state, &mut subscribed, &mut socket_tx).await;
                            }
                            Err(err) => {
                                debug!("invalid ws request frame: {:?}", err);
                                send_frame(
                                    &mut socket_tx,
                                    error_frame(
                                        "invalid".to_string(),
                                        op::SYSTEM_ERROR.to_string(),
                                        "INVALID_JSON",
                                        "Failed to parse request frame",
                                        None,
                                    ),
                                ).await;
                            }
                        }
                    }
                    Some(Ok(Message::Ping(data))) => {
                        if let Err(err) = socket_tx.send(Message::Pong(data)).await {
                            warn!("Failed to reply pong: {:?}", err);
                            break;
                        }
                    }
                    Some(Ok(Message::Close(_))) => break,
                    Some(Ok(_)) => {}
                    Some(Err(err)) => {
                        warn!("websocket receive error: {:?}", err);
                        break;
                    }
                    None => break,
                }
            }
            event_result = event_rx.recv(), if subscribed => {
                match event_result {
                    Ok(event) => {
                        if let Some(frame) = message_event_to_ws_event(event) {
                            send_frame(&mut socket_tx, frame).await;
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(skipped)) => {
                        warn!("ws event subscriber lagged, skipped {} events", skipped);
                    }
                    Err(broadcast::error::RecvError::Closed) => {
                        error!("message event channel closed");
                        break;
                    }
                }
            }
        }
    }
}

async fn message_events_ws(
    ws: WebSocketUpgrade,
    State(route_state): State<RouteState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| message_events_ws_handler(socket, route_state))
}

pub fn router() -> Router<RouteState> {
    Router::new().route("/ws/message-events", get(message_events_ws))
}
