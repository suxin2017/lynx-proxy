use crate::self_service::{
    RouteState,
    utils::{EmptyOkResponse, ResponseDataWrapper, empty_ok, ok},
};
use axum::{
    Json,
    extract::{Query, State},
    http::StatusCode,
};
use lynx_db::dao::api_debug_tree_dao::{
    ApiDebugTreeDao, CreateFolderRequest, CreateRequestNodeRequest, MoveNodeRequest,
    RenameNodeRequest, TreeNodeResponse, TreeResponse,
};
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::{router::OpenApiRouter, routes};

/// 重排序请求
#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ReorderNodesRequest {
    /// 节点排序列表，每个元素包含节点ID和新的排序值
    pub node_orders: Vec<(i32, i32)>,
}

/// 搜索查询参数
/// 获取子节点查询参数
#[derive(Debug, Serialize, Deserialize, ToSchema, IntoParams, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GetChildrenParams {
    /// 父节点ID，为空时获取根节点
    pub parent_id: Option<i32>,
}

/// 搜索查询参数
#[derive(Debug, Serialize, Deserialize, ToSchema, IntoParams, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SearchQueryParams {
    /// 搜索关键词
    pub keyword: String,
}

/// 重排序查询参数
#[derive(Debug, Serialize, Deserialize, ToSchema, IntoParams, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ReorderQueryParams {
    /// 父节点ID，为空时重排序根节点
    pub parent_id: Option<i32>,
}

/// 获取节点查询参数
#[derive(Debug, Serialize, Deserialize, ToSchema, IntoParams, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GetNodeParams {
    /// 节点ID
    pub id: i32,
}

/// 移动节点查询参数
#[derive(Debug, Serialize, Deserialize, ToSchema, IntoParams, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MoveNodeParams {
    /// 要移动的节点ID
    pub id: i32,
}

/// 重命名节点查询参数
#[derive(Debug, Serialize, Deserialize, ToSchema, IntoParams, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RenameNodeParams {
    /// 要重命名的节点ID
    pub id: i32,
}

/// 删除节点查询参数
#[derive(Debug, Serialize, Deserialize, ToSchema, IntoParams, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DeleteNodeParams {
    /// 要删除的节点ID
    pub id: i32,
}

/// 获取节点路径查询参数
#[derive(Debug, Serialize, Deserialize, ToSchema, IntoParams, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GetNodePathParams {
    /// 节点ID
    pub id: i32,
}

#[utoipa::path(
    post,
    path = "/tree/folder",
    tags = ["API Debug Tree"],
    request_body = CreateFolderRequest,
    responses(
        (status = 200, description = "文件夹节点创建成功", body = ResponseDataWrapper<TreeNodeResponse>),
        (status = 400, description = "请求数据无效"),
        (status = 500, description = "创建文件夹节点失败")
    )
)]
async fn create_folder(
    State(RouteState { db, .. }): State<RouteState>,
    Json(request): Json<CreateFolderRequest>,
) -> Result<Json<ResponseDataWrapper<TreeNodeResponse>>, StatusCode> {
    let dao = ApiDebugTreeDao::new(db);

    let result = dao.create_folder(request).await.map_err(|e| {
        tracing::error!("Failed to create folder: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(ok(result)))
}

#[utoipa::path(
    post,
    path = "/tree/request",
    tags = ["API Debug Tree"],
    request_body = CreateRequestNodeRequest,
    responses(
        (status = 200, description = "请求节点创建成功", body = ResponseDataWrapper<TreeNodeResponse>),
        (status = 400, description = "请求数据无效"),
        (status = 500, description = "创建请求节点失败")
    )
)]
async fn create_request_node(
    State(RouteState { db, .. }): State<RouteState>,
    Json(request): Json<CreateRequestNodeRequest>,
) -> Result<Json<ResponseDataWrapper<TreeNodeResponse>>, StatusCode> {
    let dao = ApiDebugTreeDao::new(db);

    let result = dao.create_request_node(request).await.map_err(|e| {
        tracing::error!("Failed to create request node: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(ok(result)))
}

#[utoipa::path(
    get,
    path = "/tree/node",
    tags = ["API Debug Tree"],
    params(GetNodeParams),
    responses(
        (status = 200, description = "成功获取节点详情", body = ResponseDataWrapper<TreeNodeResponse>),
        (status = 404, description = "节点不存在"),
        (status = 500, description = "获取节点详情失败")
    )
)]
async fn get_node(
    State(RouteState { db, .. }): State<RouteState>,
    Query(params): Query<GetNodeParams>,
) -> Result<Json<ResponseDataWrapper<TreeNodeResponse>>, StatusCode> {
    let dao = ApiDebugTreeDao::new(db);

    let result = dao.get_node(params.id).await.map_err(|e| {
        tracing::error!("Failed to get node: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    match result {
        Some(node) => Ok(Json(ok(node))),
        None => Err(StatusCode::NOT_FOUND),
    }
}

#[utoipa::path(
    get,
    path = "/tree",
    tags = ["API Debug Tree"],
    responses(
        (status = 200, description = "成功获取完整树结构", body = ResponseDataWrapper<TreeResponse>),
        (status = 500, description = "获取树结构失败")
    )
)]
async fn get_tree(
    State(RouteState { db, .. }): State<RouteState>,
) -> Result<Json<ResponseDataWrapper<TreeResponse>>, StatusCode> {
    let dao = ApiDebugTreeDao::new(db);

    let result = dao.get_tree().await.map_err(|e| {
        tracing::error!("Failed to get tree: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(ok(result)))
}

#[utoipa::path(
    get,
    path = "/tree/children",
    tags = ["API Debug Tree"],
    params(GetChildrenParams),
    responses(
        (status = 200, description = "成功获取子节点列表", body = ResponseDataWrapper<Vec<TreeNodeResponse>>),
        (status = 500, description = "获取子节点列表失败")
    )
)]
async fn get_children(
    State(RouteState { db, .. }): State<RouteState>,
    Query(params): Query<GetChildrenParams>,
) -> Result<Json<ResponseDataWrapper<Vec<TreeNodeResponse>>>, StatusCode> {
    let dao = ApiDebugTreeDao::new(db);

    let result = dao.get_children(params.parent_id).await.map_err(|e| {
        tracing::error!("Failed to get children: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(ok(result)))
}

#[utoipa::path(
    put,
    path = "/tree/move",
    tags = ["API Debug Tree"],
    params(MoveNodeParams),
    request_body = MoveNodeRequest,
    responses(
        (status = 200, description = "节点移动成功", body = ResponseDataWrapper<TreeNodeResponse>),
        (status = 404, description = "节点不存在"),
        (status = 400, description = "移动操作会造成循环引用"),
        (status = 500, description = "移动节点失败")
    )
)]
async fn move_node(
    State(RouteState { db, .. }): State<RouteState>,
    Query(params): Query<MoveNodeParams>,
    Json(request): Json<MoveNodeRequest>,
) -> Result<Json<ResponseDataWrapper<TreeNodeResponse>>, StatusCode> {
    let dao = ApiDebugTreeDao::new(db);

    let result = dao.move_node(params.id, request).await.map_err(|e| {
        tracing::error!("Failed to move node: {}", e);
        if e.to_string().contains("循环引用") {
            return StatusCode::BAD_REQUEST;
        }
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    match result {
        Some(node) => Ok(Json(ok(node))),
        None => Err(StatusCode::NOT_FOUND),
    }
}

#[utoipa::path(
    put,
    path = "/tree/rename",
    tags = ["API Debug Tree"],
    params(RenameNodeParams),
    request_body = RenameNodeRequest,
    responses(
        (status = 200, description = "节点重命名成功", body = ResponseDataWrapper<TreeNodeResponse>),
        (status = 404, description = "节点不存在"),
        (status = 500, description = "重命名节点失败")
    )
)]
async fn rename_node(
    State(RouteState { db, .. }): State<RouteState>,
    Query(params): Query<RenameNodeParams>,
    Json(request): Json<RenameNodeRequest>,
) -> Result<Json<ResponseDataWrapper<TreeNodeResponse>>, StatusCode> {
    let dao = ApiDebugTreeDao::new(db);

    let result = dao.rename_node(params.id, request).await.map_err(|e| {
        tracing::error!("Failed to rename node: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    match result {
        Some(node) => Ok(Json(ok(node))),
        None => Err(StatusCode::NOT_FOUND),
    }
}

#[utoipa::path(
    delete,
    path = "/tree/node",
    tags = ["API Debug Tree"],
    params(DeleteNodeParams),
    responses(
        (status = 200, description = "节点删除成功", body = EmptyOkResponse),
        (status = 404, description = "节点不存在"),
        (status = 500, description = "删除节点失败")
    )
)]
async fn delete_node(
    State(RouteState { db, .. }): State<RouteState>,
    Query(params): Query<DeleteNodeParams>,
) -> Result<Json<EmptyOkResponse>, StatusCode> {
    let dao = ApiDebugTreeDao::new(db);

    let result = dao.delete_node(params.id).await.map_err(|e| {
        tracing::error!("Failed to delete node: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    if result {
        Ok(Json(empty_ok()))
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

#[utoipa::path(
    put,
    path = "/tree/reorder",
    tags = ["API Debug Tree"],
    params(ReorderQueryParams),
    request_body = ReorderNodesRequest,
    responses(
        (status = 200, description = "节点重排序成功", body = EmptyOkResponse),
        (status = 500, description = "重排序节点失败")
    )
)]
async fn reorder_nodes(
    State(RouteState { db, .. }): State<RouteState>,
    Query(params): Query<ReorderQueryParams>,
    Json(request): Json<ReorderNodesRequest>,
) -> Result<Json<EmptyOkResponse>, StatusCode> {
    let dao = ApiDebugTreeDao::new(db);

    dao.reorder_nodes(params.parent_id, request.node_orders).await.map_err(|e| {
        tracing::error!("Failed to reorder nodes: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(empty_ok()))
}

#[utoipa::path(
    get,
    path = "/tree/path",
    tags = ["API Debug Tree"],
    params(GetNodePathParams),
    responses(
        (status = 200, description = "成功获取节点路径", body = ResponseDataWrapper<Vec<TreeNodeResponse>>),
        (status = 500, description = "获取节点路径失败")
    )
)]
async fn get_node_path(
    State(RouteState { db, .. }): State<RouteState>,
    Query(params): Query<GetNodePathParams>,
) -> Result<Json<ResponseDataWrapper<Vec<TreeNodeResponse>>>, StatusCode> {
    let dao = ApiDebugTreeDao::new(db);

    let result = dao.get_node_path(params.id).await.map_err(|e| {
        tracing::error!("Failed to get node path: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(ok(result)))
}

#[utoipa::path(
    get,
    path = "/tree/search",
    tags = ["API Debug Tree"],
    params(SearchQueryParams),
    responses(
        (status = 200, description = "搜索节点成功", body = ResponseDataWrapper<Vec<TreeNodeResponse>>),
        (status = 500, description = "搜索节点失败")
    )
)]
async fn search_nodes(
    State(RouteState { db, .. }): State<RouteState>,
    Query(params): Query<SearchQueryParams>,
) -> Result<Json<ResponseDataWrapper<Vec<TreeNodeResponse>>>, StatusCode> {
    let dao = ApiDebugTreeDao::new(db);

    let result = dao.search_nodes(&params.keyword).await.map_err(|e| {
        tracing::error!("Failed to search nodes: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(ok(result)))
}

pub fn router(state: RouteState) -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(create_folder))
        .routes(routes!(create_request_node))
        .routes(routes!(get_node))
        .routes(routes!(get_tree))
        .routes(routes!(get_children))
        .routes(routes!(move_node))
        .routes(routes!(rename_node))
        .routes(routes!(delete_node))
        .routes(routes!(reorder_nodes))
        .routes(routes!(get_node_path))
        .routes(routes!(search_nodes))
        .with_state(state)
}