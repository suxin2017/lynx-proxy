use crate::self_service::{
    RouteState,
    utils::{EmptyOkResponse, ResponseDataWrapper, empty_ok, ok},
};
use axum::{
    Json,
    extract::{Path, Query, State},
};
use http::StatusCode;
use lynx_db::dao::request_processing_dao::{HandlerRule, RequestProcessingDao, RequestRule, RuleValidator, CaptureRule};
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::{router::OpenApiRouter, routes};

#[derive(Debug, ToSchema, Serialize, Deserialize, IntoParams)]
#[serde(rename_all = "camelCase")]
pub struct RuleListQuery {
    /// 页码，从1开始
    pub page: Option<u32>,
    /// 每页数量，默认20
    pub page_size: Option<u32>,
    /// 是否只获取启用的规则
    pub enabled_only: Option<bool>,
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
    State(RouteState { db, .. }): State<RouteState>,
    Query(query): Query<RuleListQuery>,
) -> Result<Json<ResponseDataWrapper<RuleListResponse>>, StatusCode> {
    let dao = RequestProcessingDao::new(db);

    let mut rules = dao
        .list_rules()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if query.enabled_only.unwrap_or(false) {
        rules.retain(|rule| rule.enabled);
    }

    let total = rules.len();
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(20);

    // 分页处理
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
    State(RouteState { db, .. }): State<RouteState>,
    Path(id): Path<i32>,
) -> Result<Json<ResponseDataWrapper<RequestRule>>, StatusCode> {
    let dao = RequestProcessingDao::new(db);

    let rule = dao
        .get_rule(id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    match rule {
        Some(rule) => Ok(Json(ok(rule))),
        None => Err(StatusCode::NOT_FOUND),
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
    State(RouteState { db, .. }): State<RouteState>,
    Path(id): Path<i32>,
) -> Result<Json<EmptyOkResponse>, StatusCode> {
    let dao = RequestProcessingDao::new(db);

    // 首先检查规则是否存在
    let existing_rule = dao
        .get_rule(id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if existing_rule.is_none() {
        return Err(StatusCode::NOT_FOUND);
    }

    dao.delete_rule(id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

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
    State(RouteState { db, .. }): State<RouteState>,
    Path(id): Path<i32>,
    Json(request): Json<ToggleRuleRequest>,
) -> Result<Json<EmptyOkResponse>, StatusCode> {
    let dao = RequestProcessingDao::new(db);

    // 首先检查规则是否存在
    let existing_rule = dao
        .get_rule(id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if existing_rule.is_none() {
        return Err(StatusCode::NOT_FOUND);
    }

    dao.toggle_rule(id, request.enabled)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

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
    State(RouteState { db, .. }): State<RouteState>,
) -> Result<Json<ResponseDataWrapper<TemplateHandlersResponse>>, StatusCode> {
    let dao = RequestProcessingDao::new(db);

    let handlers = dao.get_template_handlers().await.map_err(|e| {
        println!("Failed to get template handlers: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
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
    State(RouteState { db, .. }): State<RouteState>,
    Json(request): Json<CreateRuleRequest>,
) -> Result<Json<ResponseDataWrapper<CreateRuleResponse>>, StatusCode> {
    let dao = RequestProcessingDao::new(db);

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
    RuleValidator::validate_rule(&rule)
        .map_err(|e| {
            println!("Rule validation failed: {}", e);
            StatusCode::BAD_REQUEST
        })?;

    // Create the rule
    let rule_id = dao.create_rule(rule)
        .await
        .map_err(|e| {
            println!("Failed to create rule: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
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
    State(RouteState { db, .. }): State<RouteState>,
    Path(id): Path<i32>,
    Json(request): Json<UpdateRuleRequest>,
) -> Result<Json<EmptyOkResponse>, StatusCode> {
    let dao = RequestProcessingDao::new(db);

    // 首先检查规则是否存在
    let existing_rule = dao
        .get_rule(id)
        .await
        .map_err(|e| {
            println!("Failed to get rule: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    if existing_rule.is_none() {
        return Err(StatusCode::NOT_FOUND);
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
    RuleValidator::validate_rule(&rule)
        .map_err(|e| {
            println!("Rule validation failed: {}", e);
            StatusCode::BAD_REQUEST
        })?;

    // Update the rule
    dao.update_rule(rule)
        .await
        .map_err(|e| {
            println!("Failed to update rule: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

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
        .with_state(state)
}
