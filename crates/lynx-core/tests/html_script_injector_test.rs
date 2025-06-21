use anyhow::Result;
use lynx_db::dao::request_processing_dao::{
    handlers::{HandlerRule, HtmlScriptInjectorConfig},
};

#[tokio::test]
async fn test_html_script_injector_integration() -> Result<()> {
    // Test creating a handler rule for HTML content injection
    let handler = HandlerRule::html_script_injector_handler(
        Some("<script>console.log('Hello from injected script!');</script>".to_string()),
        Some("body-end".to_string()),
    );

    assert_eq!(handler.name, "HTML Content Injector Handler");
    assert_eq!(handler.execution_order, 85);
    assert!(handler.enabled);

    // Test that the handler type is correctly set
    match &handler.handler_type {
        lynx_db::dao::request_processing_dao::handlers::handler_rule::HandlerRuleType::HtmlScriptInjector(config) => {
            assert_eq!(config.content, Some("<script>console.log('Hello from injected script!');</script>".to_string()));
            assert_eq!(config.injection_position, Some("body-end".to_string()));
        }
        _ => panic!("Expected HtmlScriptInjector handler type"),
    }

    Ok(())
}

#[tokio::test]
async fn test_html_script_injector_config_builder() -> Result<()> {
    let config = HtmlScriptInjectorConfig::new()
        .with_content("<script>console.log('test');</script>".to_string())
        .with_injection_position("head".to_string());

    assert_eq!(config.content, Some("<script>console.log('test');</script>".to_string()));
    assert_eq!(config.injection_position, Some("head".to_string()));

    Ok(())
}
