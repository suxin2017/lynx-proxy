pub mod common;
pub mod matching;
pub mod request_info;
pub mod response_info;
pub mod types;

pub use common::{BodyUtils, HeaderUtils, HttpMessage};
pub use matching::RuleMatcher;
pub use request_info::RequestInfo;
pub use response_info::ResponseInfo;
pub use types::{
    BlockHandlerConfig, CaptureRule, HandlerRule, LocalFileConfig, ModifyRequestConfig, RequestRule,
};

use crate::entities::{
    capture::{self, ActiveModel as CaptureActiveModel, Entity as CaptureEntity},
    handler::{self, ActiveModel as HandlerActiveModel, Entity as HandlerEntity},
    rule::{self, ActiveModel as RuleActiveModel, Entity as RuleEntity},
};
use anyhow::{Result, anyhow};
use sea_orm::*;
use std::sync::Arc;

pub struct RequestProcessingDao {
    db: Arc<DatabaseConnection>,
}

impl RequestProcessingDao {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }

    /// Create a new request processing rule
    pub async fn create_rule(&self, rule: RequestRule) -> Result<i32> {
        let txn = self.db.begin().await?;

        // Insert rule
        let rule_active_model = RuleActiveModel {
            id: NotSet,
            name: Set(rule.name),
            description: Set(rule.description),
            enabled: Set(rule.enabled),
            priority: Set(rule.priority),
            created_at: Set(chrono::Utc::now()),
            updated_at: Set(chrono::Utc::now()),
        };

        let rule_result = RuleEntity::insert(rule_active_model).exec(&txn).await?;
        let rule_id = rule_result.last_insert_id;

        // Insert capture
        let capture = rule.capture;
        let capture_active_model = CaptureActiveModel {
            id: NotSet,
            rule_id: Set(rule_id),
            capture_type: Set(capture.capture_type),
            pattern: Set(capture.pattern),
            method: Set(capture.method),
            host: Set(capture.host),
            config: Set(capture.config),
            enabled: Set(capture.enabled),
            created_at: Set(chrono::Utc::now()),
            updated_at: Set(chrono::Utc::now()),
        };
        CaptureEntity::insert(capture_active_model)
            .exec(&txn)
            .await?;

        // Insert handlers
        for handler in rule.handlers {
            let handler_active_model = HandlerActiveModel {
                id: NotSet,
                rule_id: Set(rule_id),
                handler_type: Set(handler.handler_type),
                name: Set(handler.name),
                description: Set(handler.description),
                execution_order: Set(handler.execution_order),
                config: Set(handler.config),
                enabled: Set(handler.enabled),
                created_at: Set(chrono::Utc::now()),
                updated_at: Set(chrono::Utc::now()),
            };
            HandlerEntity::insert(handler_active_model)
                .exec(&txn)
                .await?;
        }

        txn.commit().await?;
        Ok(rule_id)
    }

    /// Get rule by ID with capture and handlers
    pub async fn get_rule(&self, rule_id: i32) -> Result<Option<RequestRule>> {
        let rule = RuleEntity::find_by_id(rule_id)
            .one(self.db.as_ref())
            .await?;

        if let Some(rule) = rule {
            let capture = CaptureEntity::find()
                .filter(capture::Column::RuleId.eq(rule_id))
                .one(self.db.as_ref())
                .await?;

            let handlers = HandlerEntity::find()
                .filter(handler::Column::RuleId.eq(rule_id))
                .order_by_asc(handler::Column::ExecutionOrder)
                .all(self.db.as_ref())
                .await?;

            // Since capture is now required, return None if no capture found
            if let Some(capture) = capture {
                Ok(Some(RequestRule {
                    id: Some(rule.id),
                    name: rule.name,
                    description: rule.description,
                    enabled: rule.enabled,
                    priority: rule.priority,
                    capture: CaptureRule {
                        id: Some(capture.id),
                        capture_type: capture.capture_type,
                        pattern: capture.pattern,
                        method: capture.method,
                        host: capture.host,
                        config: capture.config,
                        enabled: capture.enabled,
                    },
                    handlers: handlers
                        .into_iter()
                        .map(|h| HandlerRule {
                            id: Some(h.id),
                            handler_type: h.handler_type,
                            name: h.name,
                            description: h.description,
                            execution_order: h.execution_order,
                            config: h.config,
                            enabled: h.enabled,
                        })
                        .collect(),
                }))
            } else {
                Ok(None)
            }
        } else {
            Ok(None)
        }
    }

    /// Get all rules ordered by priority
    pub async fn list_rules(&self) -> Result<Vec<RequestRule>> {
        let rules = RuleEntity::find()
            .order_by_desc(rule::Column::Priority)
            .order_by_asc(rule::Column::Id)
            .all(self.db.as_ref())
            .await?;

        let mut result = Vec::new();
        for rule in rules {
            if let Some(full_rule) = self.get_rule(rule.id).await? {
                result.push(full_rule);
            }
        }

        Ok(result)
    }

    /// Update a rule
    pub async fn update_rule(&self, rule: RequestRule) -> Result<()> {
        let rule_id = rule
            .id
            .ok_or_else(|| anyhow!("Rule ID is required for update"))?;

        let txn = self.db.begin().await?;

        // Update rule
        let rule_active_model = RuleActiveModel {
            id: Set(rule_id),
            name: Set(rule.name),
            description: Set(rule.description),
            enabled: Set(rule.enabled),
            priority: Set(rule.priority),
            updated_at: Set(chrono::Utc::now()),
            ..Default::default()
        };
        RuleEntity::update(rule_active_model).exec(&txn).await?;

        // Delete existing captures and handlers
        CaptureEntity::delete_many()
            .filter(capture::Column::RuleId.eq(rule_id))
            .exec(&txn)
            .await?;

        HandlerEntity::delete_many()
            .filter(handler::Column::RuleId.eq(rule_id))
            .exec(&txn)
            .await?;

        // Insert new capture
        let capture = rule.capture;
        let capture_active_model = CaptureActiveModel {
            id: NotSet,
            rule_id: Set(rule_id),
            capture_type: Set(capture.capture_type),
            pattern: Set(capture.pattern),
            method: Set(capture.method),
            host: Set(capture.host),
            config: Set(capture.config),
            enabled: Set(capture.enabled),
            created_at: Set(chrono::Utc::now()),
            updated_at: Set(chrono::Utc::now()),
        };
        CaptureEntity::insert(capture_active_model)
            .exec(&txn)
            .await?;

        // Insert new handlers
        for handler in rule.handlers {
            let handler_active_model = HandlerActiveModel {
                id: NotSet,
                rule_id: Set(rule_id),
                handler_type: Set(handler.handler_type),
                name: Set(handler.name),
                description: Set(handler.description),
                execution_order: Set(handler.execution_order),
                config: Set(handler.config),
                enabled: Set(handler.enabled),
                created_at: Set(chrono::Utc::now()),
                updated_at: Set(chrono::Utc::now()),
            };
            HandlerEntity::insert(handler_active_model)
                .exec(&txn)
                .await?;
        }

        txn.commit().await?;
        Ok(())
    }

    /// Delete a rule and all its captures and handlers
    pub async fn delete_rule(&self, rule_id: i32) -> Result<()> {
        let txn = self.db.begin().await?;

        // Delete captures
        CaptureEntity::delete_many()
            .filter(capture::Column::RuleId.eq(rule_id))
            .exec(&txn)
            .await?;

        // Delete handlers
        HandlerEntity::delete_many()
            .filter(handler::Column::RuleId.eq(rule_id))
            .exec(&txn)
            .await?;

        // Delete rule
        RuleEntity::delete_by_id(rule_id).exec(&txn).await?;

        txn.commit().await?;
        Ok(())
    }

    /// Find matching rules for a request
    pub async fn find_matching_rules(&self, request: &RequestInfo) -> Result<Vec<RequestRule>> {
        let all_rules = self.list_rules().await?;
        RuleMatcher::find_matching_rules(&all_rules, request)
    }

    /// Enable or disable a rule
    pub async fn toggle_rule(&self, rule_id: i32, enabled: bool) -> Result<()> {
        let rule_active_model = RuleActiveModel {
            id: Set(rule_id),
            enabled: Set(enabled),
            updated_at: Set(chrono::Utc::now()),
            ..Default::default()
        };
        RuleEntity::update(rule_active_model)
            .exec(self.db.as_ref())
            .await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::entities::{capture::CaptureType, handler::HandlerType};
    use crate::migration::Migrator;
    use axum::body::Bytes;
    use sea_orm::Database;
    use sea_orm_migration::MigratorTrait;
    use serde_json::json;
    use std::collections::HashMap;

    async fn setup_test_db() -> DatabaseConnection {
        let db = Database::connect("sqlite::memory:").await.unwrap();
        Migrator::up(&db, None).await.unwrap();
        db
    }

    #[tokio::test]
    async fn test_create_and_get_rule() -> Result<()> {
        let db = setup_test_db().await;
        let dao = RequestProcessingDao::new(Arc::new(db));

        let rule = RequestRule {
            id: None,
            name: "Test Rule".to_string(),
            description: Some("A test rule".to_string()),
            enabled: true,
            priority: 100,
            capture: CaptureRule {
                id: None,
                capture_type: CaptureType::Glob,
                pattern: "https://api.example.com/*".to_string(),
                method: Some("GET".to_string()),
                host: Some("api.example.com".to_string()),
                config: json!({}),
                enabled: true,
            },
            handlers: vec![HandlerRule {
                id: None,
                handler_type: HandlerType::Block,
                name: "Block Handler".to_string(),
                description: Some("Block the request".to_string()),
                execution_order: 0,
                config: json!({
                    "statusCode": 403,
                    "reason": "Blocked by rule"
                }),
                enabled: true,
            }],
        };

        let rule_id = dao.create_rule(rule.clone()).await?;
        assert!(rule_id > 0);

        let retrieved_rule = dao.get_rule(rule_id).await?;
        assert!(retrieved_rule.is_some());

        let retrieved_rule = retrieved_rule.unwrap();
        assert_eq!(retrieved_rule.name, rule.name);
        assert_eq!(retrieved_rule.handlers.len(), 1);

        Ok(())
    }

    #[tokio::test]
    async fn test_matching_rules() -> Result<()> {
        let db = setup_test_db().await;
        let dao = RequestProcessingDao::new(Arc::new(db));

        // Create a rule
        let rule = RequestRule {
            id: None,
            name: "API Block Rule".to_string(),
            description: None,
            enabled: true,
            priority: 100,
            capture: CaptureRule {
                id: None,
                capture_type: CaptureType::Glob,
                pattern: "https://api.example.com/*".to_string(),
                method: Some("GET".to_string()),
                host: None,
                config: json!({}),
                enabled: true,
            },
            handlers: vec![HandlerRule {
                id: None,
                handler_type: HandlerType::Block,
                name: "Block Handler".to_string(),
                description: None,
                execution_order: 0,
                config: json!({}),
                enabled: true,
            }],
        };

        dao.create_rule(rule).await?;

        // Test matching request
        let request = RequestInfo {
            url: "https://api.example.com/users".to_string(),
            method: "GET".to_string(),
            host: "api.example.com".to_string(),
            headers: HashMap::new(),
            body: Bytes::new(),
        };

        let matching_rules = dao.find_matching_rules(&request).await?;
        assert_eq!(matching_rules.len(), 1);

        // Test non-matching request
        let request = RequestInfo {
            url: "https://other.example.com/users".to_string(),
            method: "GET".to_string(),
            host: "other.example.com".to_string(),
            headers: HashMap::new(),
            body: Bytes::new(),
        };

        let matching_rules = dao.find_matching_rules(&request).await?;
        assert_eq!(matching_rules.len(), 0);

        Ok(())
    }
}
