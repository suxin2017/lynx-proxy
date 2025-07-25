use anyhow::{Ok, Result};
use http::Method;
use lynx_core::self_service::{
    api::net_request::RecordRequests,
    utils::{ResponseCode, ResponseDataWrapper},
};
use lynx_db::dao::net_request_dao::{CaptureSwitch, CaptureSwitchDao, RecordingStatus};
use lynx_mock::client::MockClient;
use setup::{setup_mock_server::setup_mock_server, setup_proxy_server::setup_proxy_server};
use std::sync::Arc;

use crate::setup::base_url;
mod setup;

#[tokio::test]
async fn proxy_log_test() -> Result<()> {
    let mock_server = setup_mock_server().await?;
    let proxy_server = setup_proxy_server(Some(Arc::new(vec![mock_server.cert.clone()]))).await?;
    let proxy_server_root_ca = proxy_server.server_ca_manager.ca_cert.clone();

    CaptureSwitchDao::new(proxy_server.db_connect.clone())
        .update_capture_switch(CaptureSwitch {
            recording_status: RecordingStatus::PauseRecording,
        })
        .await?;

    let proxy_addr = format!("http://{}", proxy_server.access_addr_list.first().unwrap());

    let client = MockClient::new(
        Some(vec![mock_server.cert.clone(), proxy_server_root_ca]),
        Some(proxy_addr),
    )?;
    client.test_request_http_request(&mock_server).await?;

    let base_url = base_url(&proxy_server);
    let toggle_response = client
        .get_request_client()
        .request(Method::POST, format!("{}/net_request/requests", base_url))
        .json(&serde_json::json!({}))
        .send()
        .await?;
    let data = toggle_response
        .json::<ResponseDataWrapper<RecordRequests>>()
        .await?;

    assert!(matches!(data.code, ResponseCode::Ok));
    assert_eq!(
        data.data.new_requests.len(),
        mock_server.get_http_mock_paths().len()
    );

    Ok(())
}
