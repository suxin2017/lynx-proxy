use crate::error::CoreError;
use crate::self_service::{
    RouteState,
    utils::{EmptyOkResponse, ResponseDataWrapper, empty_ok, ok},
};
use axum::{
    Json,
    extract::{Path, Query, State},
};
use lynx_storage::dao::request_processing_dao::{
    CaptureRule, HandlerRule, RequestProcessingDao, RequestRule, RuleValidator,
};
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::{router::OpenApiRouter, routes};

#[derive(Debug, ToSchema, Serialize, Deserialize, IntoParams)]
#[serde(rename_all = "camelCase")]
pub struct RuleListQuery {
    pub page: Option<u32>,
    pub page_size: Option<u32>,
    pub enabled_only: Option<bool>,
    pub name: Option<String>,
}

#[derive(Debug, ToSchema, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuleListResponse {
    pub rules: Vec<RequestRule>,
    pub total: usize,
    pub page: u32,
    pub page_size: u32,
}

#[derive(Debug, ToSchema, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToggleRuleRequest {
    pub enabled: bool,
}

#[derive(Debug, ToSchema, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateHandlersResponse {
    pub handlers: Vec<HandlerRule>,
}

#[derive(Debug, ToSchema, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRuleRequest {
    pub name: String,
    pub description: Option<String>,
    pub enabled: bool,
    pub priority: i32,
    pub capture: CaptureRule,
    pub handlers: Vec<HandlerRule>,
}

#[derive(Debug, ToSchema, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRuleResponse {
    pub id: i32,
}

#[derive(Debug, ToSchema, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateRuleRequest {
    pub name: String,
    pub description: Option<String>,
    pub enabled: bool,
    pub priority: i32,
    pub capture: CaptureRule,
    pub handlers: Vec<HandlerRule>,
}

#[derive(Debug, ToSchema, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchRuleIdsRequest {
    /// 规则ID列表
    pub ids: Vec<i32>,
}

#[utoipa::path(
    get,
    path = "/rules",
    tags = ["Request Processing"],
    params(RuleListQuery),
    responses(
        (status = 200, description = "Successfully retrieved rules list", body = ResponseDataWrapper<RuleListResponse>),
        (status = 500, description = "Failed to get rules list")
    )
)]
async fn list_rules(
    State(RouteState { store, .. }): State<RouteState>,
    Query(query): Query<RuleListQuery>,
) -> Result<Json<ResponseDataWrapper<RuleListResponse>>, CoreError> {
    let dao = RequestProcessingDao::new(store);

    let mut rules = dao
        .list_rules()
        .await
        .map_err(|e| CoreError::Db { operation: "list rules", source: anyhow::anyhow!(e) })?;

    if query.enabled_only.unwrap_or(false) {
        rules.retain(|rule| rule.enabled);
    }

    if let Some(name) = query.name {
        rules.retain(|rule| rule.name.to_lowercase().contains(&name.to_lowercase()));
    }

    let total = rules.len();
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(20);

    let start = ((page - 1) * page_size) as usize;
    let end = (start + page_size as usize).min(total);

    let paginated_rules = if start < total {
        rules[start..end].to_vec()
    } else {
        vec![]
    };

    let response = RuleListResponse {
        rules: paginated_rules,
        total,
        page,
        page_size,
    };

    Ok(Json(ok(response)))
}

#[utoipa::path(
    get,
    path = "/rules/{id}",
    tags = ["Request Processing"],
    params(
        ("id" = i32, Path, description = "Rule ID")
    ),
    responses(
        (status = 200, description = "Successfully retrieved rule", body = ResponseDataWrapper<RequestRule>),
        (status = 404, description = "Rule not found"),
        (status = 500, description = "Failed to get rule")
    )
)]
async fn get_rule(
    State(RouteState { store, .. }): State<RouteState>,
    Path(id): Path<i32>,
) -> Result<Json<ResponseDataWrapper<RequestRule>>, CoreError> {
    let dao = RequestProcessingDao::new(store);

    let rule = dao
        .get_rule(id)
        .await
        .map_err(|e| CoreError::Db { operation: "get rule", source: anyhow::anyhow!(e) })?;

    match rule {
        Some(rule) => Ok(Json(ok(rule))),
        None => Err(CoreError::NotFound { message: format!("rule {id} not found") }),
    }
}

#[utoipa::path(
    delete,
    path = "/rules/{id}",
    tags = ["Request Processing"],
    params(
        ("id" = i32, Path, description = "Rule ID")
    ),
    responses(
        (status = 200, description = "Rule deleted successfully", body = EmptyOkResponse),
        (status = 404, description = "Rule not found"),
        (status = 500, description = "Failed to delete rule")
    )
)]
async fn delete_rule(
    State(RouteState { store, .. }): State<RouteState>,
    Path(id): Path<i32>,
) -> Result<Json<EmptyOkResponse>, CoreError> {
    let dao = RequestProcessingDao::new(store);

    // 首先检查规则是否存�?
    let existing_rule = dao
        .get_rule(id)
        .await
        .map_err(|e| CoreError::Db { operation: "get rule for delete", source: anyhow::anyhow!(e) })?;

    if existing_rule.is_none() {
        return Err(CoreError::NotFound { message: format!("rule {id} not found") });
    }

    dao.delete_rule(id)
        .await
        .map_err(|e| CoreError::Db { operation: "delete rule", source: anyhow::anyhow!(e) })?;

    Ok(Json(empty_ok()))
}

#[utoipa::path(
    patch,
    path = "/rules/{id}/toggle",
    tags = ["Request Processing"],
    params(
        ("id" = i32, Path, description = "Rule ID")
    ),
    request_body = ToggleRuleRequest,
    responses(
        (status = 200, description = "Rule status toggled successfully", body = EmptyOkResponse),
        (status = 404, description = "Rule not found"),
        (status = 500, description = "Failed to toggle rule status")
    )
)]
async fn toggle_rule(
    State(RouteState { store, .. }): State<RouteState>,
    Path(id): Path<i32>,
    Json(request): Json<ToggleRuleRequest>,
) -> Result<Json<EmptyOkResponse>, CoreError> {
    let dao = RequestProcessingDao::new(store);

    // 首先检查规则是否存�?
    let existing_rule = dao
        .get_rule(id)
        .await
        .map_err(|e| CoreError::Db { operation: "get rule for toggle", source: anyhow::anyhow!(e) })?;

    if existing_rule.is_none() {
        return Err(CoreError::NotFound { message: format!("rule {id} not found") });
    }

    dao.toggle_rule(id, request.enabled)
        .await
        .map_err(|e| CoreError::Db { operation: "toggle rule", source: anyhow::anyhow!(e) })?;

    Ok(Json(empty_ok()))
}

#[utoipa::path(
    get,
    path = "/templates/handlers",
    tags = ["Request Processing"],
    responses(
        (status = 200, description = "Successfully retrieved template handlers", body = ResponseDataWrapper<TemplateHandlersResponse>),
        (status = 500, description = "Failed to get template handlers")
    )
)]
async fn get_template_handlers(
    State(RouteState { store, .. }): State<RouteState>,
) -> Result<Json<ResponseDataWrapper<TemplateHandlersResponse>>, CoreError> {
    let dao = RequestProcessingDao::new(store);

    let handlers = dao.get_template_handlers().await.map_err(|e| {
        tracing::error!("Failed to get template handlers: {}", e);
        CoreError::Db { operation: "get template handlers", source: anyhow::anyhow!(e) }
    })?;

    let response = TemplateHandlersResponse { handlers };

    Ok(Json(ok(response)))
}

#[utoipa::path(
    post,
    path = "/rule",
    tags = ["Request Processing"],
    request_body = CreateRuleRequest,
    responses(
        (status = 201, description = "Rule created successfully", body = ResponseDataWrapper<CreateRuleResponse>),
        (status = 400, description = "Invalid rule data"),
        (status = 500, description = "Failed to create rule")
    )
)]
async fn create_rule(
    State(RouteState { store, .. }): State<RouteState>,
    Json(request): Json<CreateRuleRequest>,
) -> Result<Json<ResponseDataWrapper<CreateRuleResponse>>, CoreError> {
    let dao = RequestProcessingDao::new(store);

    // Validate the rule
    let rule = RequestRule {
        id: None,
        name: request.name,
        description: request.description,
        enabled: request.enabled,
        priority: request.priority,
        capture: request.capture,
        handlers: request.handlers,
    };

    // Validate rule using validator
    RuleValidator::validate_rule(&rule).map_err(|e| {
        tracing::error!("Rule validation failed: {}", e);
        CoreError::Validation { message: e.to_string() }
    })?;

    // Create the rule
    let rule_id = dao.create_rule(rule).await.map_err(|e| {
        tracing::error!("Failed to create rule: {}", e);
        CoreError::Db { operation: "create rule", source: anyhow::anyhow!(e) }
    })?;

    let response = CreateRuleResponse { id: rule_id };
    Ok(Json(ok(response)))
}

#[utoipa::path(
    put,
    path = "/rules/{id}",
    tags = ["Request Processing"],
    params(
        ("id" = i32, Path, description = "Rule ID")
    ),
    request_body = UpdateRuleRequest,
    responses(
        (status = 200, description = "Rule updated successfully", body = EmptyOkResponse),
        (status = 404, description = "Rule not found"),
        (status = 400, description = "Invalid rule data"),
        (status = 500, description = "Failed to update rule")
    )
)]
async fn update_rule(
    State(RouteState { store, .. }): State<RouteState>,
    Path(id): Path<i32>,
    Json(request): Json<UpdateRuleRequest>,
) -> Result<Json<EmptyOkResponse>, CoreError> {
    let dao = RequestProcessingDao::new(store);

    // 首先检查规则是否存�?
    let existing_rule = dao.get_rule(id).await.map_err(|e| {
        tracing::error!("Failed to get rule: {}", e);
        CoreError::Db { operation: "get rule for update", source: anyhow::anyhow!(e) }
    })?;

    if existing_rule.is_none() {
        return Err(CoreError::NotFound { message: format!("rule {id} not found") });
    }

    // Validate the rule
    let rule = RequestRule {
        id: Some(id),
        name: request.name,
        description: request.description,
        enabled: request.enabled,
        priority: request.priority,
        capture: request.capture,
        handlers: request.handlers,
    };

    // Validate rule using validator
    RuleValidator::validate_rule(&rule).map_err(|e| {
        tracing::error!("Rule validation failed: {}", e);
        CoreError::Validation { message: e.to_string() }
    })?;

    // Update the rule
    dao.update_rule(rule).await.map_err(|e| {
        tracing::error!("Failed to update rule: {}", e);
        CoreError::Db { operation: "update rule", source: anyhow::anyhow!(e) }
    })?;

    Ok(Json(empty_ok()))
}

#[utoipa::path(
    post,
    path = "/rules/batch-delete",
    tags = ["Request Processing"],
    request_body = BatchRuleIdsRequest,
    responses(
        (status = 200, description = "Rules deleted successfully", body = EmptyOkResponse),
        (status = 500, description = "Failed to delete rules")
    )
)]
async fn batch_delete_rules(
    State(RouteState { store, .. }): State<RouteState>,
    Json(request): Json<BatchRuleIdsRequest>,
) -> Result<Json<EmptyOkResponse>, CoreError> {
    let dao = RequestProcessingDao::new(store);
    dao.batch_delete_rules(&request.ids)
        .await
        .map_err(|e| CoreError::Db { operation: "batch delete rules", source: anyhow::anyhow!(e) })?;
    Ok(Json(empty_ok()))
}

#[utoipa::path(
    post,
    path = "/rules/batch-enable",
    tags = ["Request Processing"],
    request_body = BatchRuleIdsRequest,
    responses(
        (status = 200, description = "Rules enabled successfully", body = EmptyOkResponse),
        (status = 500, description = "Failed to enable rules")
    )
)]
async fn batch_enable_rules(
    State(RouteState { store, .. }): State<RouteState>,
    Json(request): Json<BatchRuleIdsRequest>,
) -> Result<Json<EmptyOkResponse>, CoreError> {
    let dao = RequestProcessingDao::new(store);
    dao.batch_toggle_rules(&request.ids, true)
        .await
        .map_err(|e| CoreError::Db { operation: "batch enable rules", source: anyhow::anyhow!(e) })?;
    Ok(Json(empty_ok()))
}

#[utoipa::path(
    post,
    path = "/rules/batch-disable",
    tags = ["Request Processing"],
    request_body = BatchRuleIdsRequest,
    responses(
        (status = 200, description = "Rules disabled successfully", body = EmptyOkResponse),
        (status = 500, description = "Failed to disable rules")
    )
)]
async fn batch_disable_rules(
    State(RouteState { store, .. }): State<RouteState>,
    Json(request): Json<BatchRuleIdsRequest>,
) -> Result<Json<EmptyOkResponse>, CoreError> {
    let dao = RequestProcessingDao::new(store);
    dao.batch_toggle_rules(&request.ids, false)
        .await
        .map_err(|e| CoreError::Db { operation: "batch disable rules", source: anyhow::anyhow!(e) })?;
    Ok(Json(empty_ok()))
}

pub fn router(state: RouteState) -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(list_rules))
        .routes(routes!(create_rule))
        .routes(routes!(get_rule))
        .routes(routes!(update_rule))
        .routes(routes!(delete_rule))
        .routes(routes!(toggle_rule))
        .routes(routes!(get_template_handlers))
        .routes(routes!(batch_delete_rules))
        .routes(routes!(batch_enable_rules))
        .routes(routes!(batch_disable_rules))
        .with_state(state)
}


