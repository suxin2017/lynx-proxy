use anyhow::{Result, anyhow};
use lynx_storage::dao::request_processing_dao::{
    HandlerRule, RequestProcessingDao, RequestProcessingError, RequestRule, RuleValidator,
};

use crate::self_service::RouteState;

fn map_validation(err: RequestProcessingError) -> anyhow::Error {
    match err {
        RequestProcessingError::RuleValidation { reason }
        | RequestProcessingError::InvalidCapturePattern { reason, .. }
        | RequestProcessingError::InvalidHandlerConfig { reason, .. }
        | RequestProcessingError::Transaction { reason } => anyhow::anyhow!(reason),
        other => anyhow::anyhow!(other.to_string()),
    }
}

pub async fn list_rules(state: &RouteState) -> Result<Vec<RequestRule>> {
    let dao = RequestProcessingDao::new(state.store.clone());
    dao.list_rules().await.map_err(Into::into)
}

pub async fn get_rule(state: &RouteState, rule_id: i32) -> Result<Option<RequestRule>> {
    let dao = RequestProcessingDao::new(state.store.clone());
    dao.get_rule(rule_id).await.map_err(Into::into)
}

pub async fn save_rule(state: &RouteState, rule: RequestRule) -> Result<RequestRule> {
    RuleValidator::validate_rule(&rule).map_err(map_validation)?;
    let dao = RequestProcessingDao::new(state.store.clone());

    if let Some(id) = rule.id {
        dao.update_rule(rule.clone()).await?;
        dao.get_rule(id)
            .await?
            .ok_or_else(|| anyhow!("Rule {id} not found after update"))
    } else {
        let id = dao.create_rule(rule).await?;
        dao.get_rule(id)
            .await?
            .ok_or_else(|| anyhow!("Rule {id} not found after create"))
    }
}

pub async fn delete_rule(state: &RouteState, rule_id: i32) -> Result<()> {
    let dao = RequestProcessingDao::new(state.store.clone());
    if dao.get_rule(rule_id).await?.is_none() {
        return Err(anyhow!("Rule {rule_id} not found"));
    }
    dao.delete_rule(rule_id).await.map_err(Into::into)
}

pub async fn set_rule_enabled(
    state: &RouteState,
    rule_id: i32,
    enabled: bool,
) -> Result<RequestRule> {
    let dao = RequestProcessingDao::new(state.store.clone());
    dao.toggle_rule(rule_id, enabled).await?;
    dao.get_rule(rule_id)
        .await?
        .ok_or_else(|| anyhow!("Rule {rule_id} not found"))
}

pub async fn list_templates(state: &RouteState) -> Result<Vec<HandlerRule>> {
    let dao = RequestProcessingDao::new(state.store.clone());
    dao.get_template_handlers().await.map_err(Into::into)
}
