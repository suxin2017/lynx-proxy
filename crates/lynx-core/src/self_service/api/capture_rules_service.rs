use anyhow::Result;
use lynx_storage::dao::capture_rules_dao::{CaptureRule, CaptureRuleKind, CaptureRulesDao};

use crate::self_service::RouteState;

pub async fn list_focus(state: &RouteState) -> Result<Vec<CaptureRule>> {
    let dao = CaptureRulesDao::new(state.store.clone());
    dao.list(CaptureRuleKind::Focus).await.map_err(Into::into)
}

pub async fn list_ignore(state: &RouteState) -> Result<Vec<CaptureRule>> {
    let dao = CaptureRulesDao::new(state.store.clone());
    dao.list(CaptureRuleKind::Ignore).await.map_err(Into::into)
}

pub async fn upsert_focus(state: &RouteState, rule: CaptureRule) -> Result<CaptureRule> {
    let dao = CaptureRulesDao::new(state.store.clone());
    dao.upsert(CaptureRuleKind::Focus, rule).await.map_err(Into::into)
}

pub async fn upsert_ignore(state: &RouteState, rule: CaptureRule) -> Result<CaptureRule> {
    let dao = CaptureRulesDao::new(state.store.clone());
    dao.upsert(CaptureRuleKind::Ignore, rule).await.map_err(Into::into)
}

pub async fn delete_focus(state: &RouteState, rule_id: i32) -> Result<()> {
    let dao = CaptureRulesDao::new(state.store.clone());
    dao.delete(CaptureRuleKind::Focus, rule_id).await.map_err(Into::into)
}

pub async fn delete_ignore(state: &RouteState, rule_id: i32) -> Result<()> {
    let dao = CaptureRulesDao::new(state.store.clone());
    dao.delete(CaptureRuleKind::Ignore, rule_id).await.map_err(Into::into)
}

pub async fn set_focus_enabled(state: &RouteState, rule_id: i32, enabled: bool) -> Result<CaptureRule> {
    let dao = CaptureRulesDao::new(state.store.clone());
    dao.set_enabled(CaptureRuleKind::Focus, rule_id, enabled)
        .await
        .map_err(Into::into)
}

pub async fn set_ignore_enabled(state: &RouteState, rule_id: i32, enabled: bool) -> Result<CaptureRule> {
    let dao = CaptureRulesDao::new(state.store.clone());
    dao.set_enabled(CaptureRuleKind::Ignore, rule_id, enabled)
        .await
        .map_err(Into::into)
}

