use anyhow::Result;
use lynx_storage::dao::net_request_dao::{CaptureSwitch, CaptureSwitchDao, RecordingStatus};

use crate::layers::message_package_layer::message_event_store::MessageEventStoreValue;
use crate::layers::trace_id_layer::service::TraceId;
use crate::self_service::RouteState;

pub async fn get_capture_status(state: &RouteState) -> Result<CaptureSwitch> {
    let dao = CaptureSwitchDao::new(state.store.clone());
    dao.get_capture_switch().await
}

pub async fn set_capture_recording(state: &RouteState, recording: bool) -> Result<CaptureSwitch> {
    let dao = CaptureSwitchDao::new(state.store.clone());
    let recording_status = if recording {
        RecordingStatus::StartRecording
    } else {
        RecordingStatus::PauseRecording
    };

    let switch = CaptureSwitch { recording_status };
    dao.update_capture_switch(switch.clone()).await?;

    Ok(switch)
}

pub async fn toggle_capture_status(state: &RouteState) -> Result<CaptureSwitch> {
    let current = get_capture_status(state).await?;
    let next_recording = matches!(current.recording_status, RecordingStatus::PauseRecording);

    set_capture_recording(state, next_recording).await
}

pub async fn get_cached_requests(
    state: &RouteState,
    trace_ids: Vec<String>,
) -> Result<Vec<MessageEventStoreValue>> {
    if trace_ids.is_empty() {
        state.net_request_cache.get_new_requests().await
    } else {
        state.net_request_cache.get_request_by_keys(trace_ids).await
    }
}

pub async fn get_request_detail(
    state: &RouteState,
    trace_id: String,
) -> Result<Option<MessageEventStoreValue>> {
    let id: TraceId = std::sync::Arc::new(trace_id);
    Ok(state.net_request_cache.get(&id))
}

pub fn recording_status_text(status: &RecordingStatus) -> &'static str {
    match status {
        RecordingStatus::StartRecording => "recording",
        RecordingStatus::PauseRecording => "paused",
    }
}
