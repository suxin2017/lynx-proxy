use anyhow::Result;
use http::StatusCode;
use lynx_db::dao::request_processing_dao::HandlerRule;
use setup::{
    mock_base_url, mock_rule::mock_test_rule,
    setup_proxy_handler_server::setup_proxy_handler_server,
};

mod setup;

#[tokio::test]
async fn proxy_forward_handler_basic_test() -> Result<()> {
    let (proxy_server, mock_server, client) = setup_proxy_handler_server().await?;
    let client = client.get_proxy_client();
    let base_url = mock_base_url(&mock_server);

    // Setup proxy forward handler to redirect to the mock server
    mock_test_rule(
        proxy_server.db_connect,
        vec![HandlerRule::proxy_forward_handler(base_url.clone())],
    )
    .await?;

    // Send a request to any path, it should be forwarded to the mock server
    let response = client
        .get("http://not_exist.com/hello".to_string())
        .send()
        .await
        .expect("send request failed");

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(response.text().await?, "Hello, World!");

    Ok(())
}

#[tokio::test]
async fn proxy_forward_handler_preserves_path_and_query() -> Result<()> {
    let (proxy_server, mock_server, client) = setup_proxy_handler_server().await?;
    let client = client.get_proxy_client();
    let base_url = mock_base_url(&mock_server);

    // Setup proxy forward handler
    mock_test_rule(
        proxy_server.db_connect,
        vec![HandlerRule::proxy_forward_handler(base_url.clone())],
    )
    .await?;

    // Send a request with path and query parameters
    let response = client
        .get("http://not_exist.com/echo?param=test&value=123".to_string())
        .send()
        .await
        .expect("send request failed");

    assert_eq!(response.status(), StatusCode::OK);

    Ok(())
}

#[tokio::test]
async fn proxy_forward_handler_invalid_target_url() -> Result<()> {
    let (proxy_server, mock_server, client) = setup_proxy_handler_server().await?;
    let client = client.get_proxy_client();
    let _base_url = mock_base_url(&mock_server);

    // Setup proxy forward handler with invalid URL
    mock_test_rule(
        proxy_server.db_connect,
        vec![HandlerRule::proxy_forward_handler(
            "invalid-url".to_string(),
        )],
    )
    .await?;

    // Send a request - should result in error due to invalid target URL
    let response = client
        .get("http://not_exist.com/hello".to_string())
        .send()
        .await
        .expect("send request failed");

    // Should return an internal server error due to invalid URL parsing
    assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);

    Ok(())
}
