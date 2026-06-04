use serde_json::{Value, json};

use crate::adb::EnableProxyPayload;
use crate::self_service::RouteState;

pub async fn status(state: &RouteState) -> Value {
    let status = state.adb.status().await;
    serde_json::to_value(status).unwrap_or_default()
}

pub async fn install(state: &RouteState) -> Result<Value, String> {
    state
        .adb
        .install_platform_tools()
        .await
        .map(|s| serde_json::to_value(s).unwrap_or_default())
        .map_err(|e| e.to_string())
}

pub async fn install_progress(state: &RouteState) -> Value {
    let progress = state.adb.install_progress().await;
    serde_json::to_value(progress).unwrap_or_default()
}

pub async fn list_devices(state: &RouteState) -> Result<Value, String> {
    let devices = state.adb.list_devices().await.map_err(|e| e.to_string())?;
    Ok(json!({ "devices": devices }))
}

pub async fn proxy_state(state: &RouteState, serial: &str) -> Result<Value, String> {
    let adb_path = state
        .adb
        .resolve_adb_path()
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "ADB is not installed".to_string())?;
    let proxy = state
        .adb
        .proxy_state(&adb_path, serial)
        .await
        .map_err(|e| e.to_string())?;
    serde_json::to_value(proxy).map_err(|e| e.to_string())
}

pub async fn enable_proxy(state: &RouteState, payload: EnableProxyPayload) -> Result<Value, String> {
    let addrs: Vec<_> = state.access_addr_list.iter().copied().collect();
    let proxy = state
        .adb
        .enable_proxy(&addrs, payload)
        .await
        .map_err(|e| e.to_string())?;
    serde_json::to_value(proxy).map_err(|e| e.to_string())
}

pub async fn disable_proxy(state: &RouteState, serial: &str) -> Result<Value, String> {
    let proxy = state
        .adb
        .disable_proxy(serial)
        .await
        .map_err(|e| e.to_string())?;
    serde_json::to_value(proxy).map_err(|e| e.to_string())
}

