use axum::extract::State;
use axum::response::sse::{Event, Sse};
use axum::response::{IntoResponse, Response};
use base64::{Engine as _, engine::general_purpose};
use futures_util::stream::Stream;
use std::time::Duration;
use tokio_stream::{StreamExt, wrappers::BroadcastStream};
use tracing::info;
use utoipa::ToSchema;
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::layers::message_package_layer::message_event_store::MessageEvent;
use crate::self_service::RouteState;

/// SSE 推送数据结构
#[derive(serde::Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SseData {
    pub event_type: String,
    pub trace_id: String,
    pub timestamp: i64,
    pub data: Option<String>,
}

impl TryFrom<MessageEvent> for SseData {
    type Error = anyhow::Error;

    fn try_from(value: MessageEvent) -> Result<Self, Self::Error> {
        let timestamp = chrono::Utc::now().timestamp_millis();

        match value {
            MessageEvent::OnRequestStart(trace_id, req) => Ok(SseData {
                event_type: "requestStart".to_string(),
                trace_id: trace_id.to_string(),
                timestamp,
                data: Some(serde_json::to_string(&req).unwrap_or_default()),
            }),
            MessageEvent::OnRequestBody(trace_id, body_data) => Ok(SseData {
                event_type: "requestBody".to_string(),
                trace_id: trace_id.to_string(),
                timestamp,
                data: body_data.map(|bytes| general_purpose::STANDARD.encode(bytes)),
            }),
            MessageEvent::OnRequestEnd(trace_id) => Ok(SseData {
                event_type: "requestEnd".to_string(),
                trace_id: trace_id.to_string(),
                timestamp,
                data: None,
            }),
            MessageEvent::OnResponseBody(trace_id, body_data) => Ok(SseData {
                event_type: "responseBody".to_string(),
                trace_id: trace_id.to_string(),
                timestamp,
                data: body_data.map(|bytes| general_purpose::STANDARD.encode(bytes)),
            }),
            MessageEvent::OnProxyStart(trace_id) => Ok(SseData {
                event_type: "proxyStart".to_string(),
                trace_id: trace_id.to_string(),
                timestamp,
                data: None,
            }),
            MessageEvent::OnProxyEnd(trace_id) => Ok(SseData {
                event_type: "proxyEnd".to_string(),
                trace_id: trace_id.to_string(),
                timestamp,
                data: None,
            }),
            MessageEvent::OnResponseStart(trace_id, res) => Ok(SseData {
                event_type: "responseStart".to_string(),
                trace_id: trace_id.to_string(),
                timestamp,
                data: Some(serde_json::to_string(&res).unwrap_or_default()),
            }),
            MessageEvent::OnWebSocketStart(trace_id) => Ok(SseData {
                event_type: "websocketStart".to_string(),
                trace_id: trace_id.to_string(),
                timestamp,
                data: None,
            }),
            MessageEvent::OnWebSocketError(trace_id, error) => Ok(SseData {
                event_type: "websocketError".to_string(),
                trace_id: trace_id.to_string(),
                timestamp,
                data: Some(error),
            }),
            MessageEvent::OnWebSocketMessage(trace_id, log) => Ok(SseData {
                event_type: "websocketMessage".to_string(),
                trace_id: trace_id.to_string(),
                timestamp,
                data: Some(serde_json::to_string(&log).unwrap_or_default()),
            }),
            MessageEvent::OnTunnelStart(trace_id) => Ok(SseData {
                event_type: "tunnelStart".to_string(),
                trace_id: trace_id.to_string(),
                timestamp,
                data: None,
            }),
            MessageEvent::OnTunnelEnd(trace_id) => Ok(SseData {
                event_type: "tunnelEnd".to_string(),
                trace_id: trace_id.to_string(),
                timestamp,
                data: None,
            }),
            MessageEvent::OnError(trace_id, error) => Ok(SseData {
                event_type: "requestError".to_string(),
                trace_id: trace_id.to_string(),
                timestamp,
                data: Some(error),
            }),
        }
    }
}

/// 创建 SSE 数据流，监听 MessageEvent
fn create_message_event_stream(
    receiver: tokio::sync::broadcast::Receiver<MessageEvent>,
) -> impl Stream<Item = Result<Event, std::convert::Infallible>> {
    BroadcastStream::new(receiver).map(|result| {
        match result {
            Ok(event) => {
                // 使用 TryFrom 转换 MessageEvent 为 SseData
                match SseData::try_from(event) {
                    Ok(sse_data) => {
                        let json_data =
                            serde_json::to_string(&sse_data).unwrap_or_else(|_| "{}".to_string());
                        info!(
                            "Sending SSE event: {:?}, trace_id: {}",
                            sse_data.event_type, sse_data.trace_id,
                        );
                        Ok(Event::default().event(&sse_data.event_type).data(json_data))
                    }
                    Err(_) => {
                        // 转换失败，返回空的 keep-alive
                        Ok(Event::default().data(""))
                    }
                }
            }
            Err(_) => {
                // 广播错误，返回一个空的 keep-alive
                Ok(Event::default().data(""))
            }
        }
    })
}

#[utoipa::path(
    get,
    path = "/sse/message-events",
    tags = ["Net Request SSE"],
    responses(
        (status = 200, description = "SSE stream for message events", content_type = "text/event-stream"),
        (status = 500, description = "Failed to establish SSE connection")
    )
)]
/// SSE 接口：推送网络请求事件
async fn message_events_sse(State(route_state): State<RouteState>) -> Response {
    let receiver = route_state.message_event_channel.subscribe();
    let stream = create_message_event_stream(receiver);

    Sse::new(stream)
        .keep_alive(
            axum::response::sse::KeepAlive::new()
                .interval(Duration::from_secs(15))
                .text("keep-alive-text"),
        )
        .into_response()
}

/// 注册 SSE 路由
pub fn create_net_request_sse_routes() -> OpenApiRouter<RouteState> {
    OpenApiRouter::new().routes(routes!(message_events_sse))
}
