use std::sync::Arc;

use anyhow::Result;
use lynx_db::dao::request_processing_dao::{
    CaptureRule, HandlerRule, RequestProcessingDao, RequestRule,
    types::{CaptureCondition, SimpleCaptureCondition},
};
use lynx_db::entities::capture::CaptureType;
use sea_orm::DatabaseConnection;

#[allow(dead_code)]
pub async fn create_test_rule(
    dao: &RequestProcessingDao,
    name: &str,
    enabled: bool,
) -> Result<i32> {
    let rule = RequestRule {
        id: None,
        name: name.to_string(),
        description: Some("Test rule description".to_string()),
        enabled,
        priority: 1,
        capture: create_basic_capture_rule(),
        handlers: vec![],
    };

    dao.create_rule(rule).await
}

#[allow(dead_code)]
pub fn create_basic_capture_rule() -> CaptureRule {
    use lynx_db::dao::request_processing_dao::types::UrlPattern;

    CaptureRule {
        id: None,
        condition: CaptureCondition::Simple(SimpleCaptureCondition {
            url_pattern: Some(UrlPattern {
                capture_type: CaptureType::Glob,
                pattern: "/api/*".to_string(),
            }),
            method: Some("GET".to_string()),
            host: None,
            headers: None,
        }),
    }
}

#[allow(dead_code)]
pub async fn mock_test_rule(
    db: Arc<DatabaseConnection>,
    handlers: Vec<HandlerRule>,
) -> Result<i32> {
    let dao = RequestProcessingDao::new(db);

    let rule = RequestRule {
        id: None,
        name: "Test Rule".to_string(),
        description: Some("Test rule description".to_string()),
        enabled: true,
        priority: 1,
        capture: CaptureRule {
            id: None,
            condition: CaptureCondition::Simple(SimpleCaptureCondition {
                url_pattern: Some(lynx_db::dao::request_processing_dao::types::UrlPattern {
                    capture_type: CaptureType::Glob,
                    pattern: "*".to_string(),
                }),
                method: None,
                host: None,
                headers: None,
            }),
        },
        handlers,
    };
    dao.create_rule(rule).await
}
