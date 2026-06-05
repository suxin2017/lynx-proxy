use axum::Json;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use lynx_storage::dao::api_studio::{
    ApiStudioError, ApiStudioStore, CreateCollectionNode, CreateHistoryEntry, HistoryListParams,
    MoveCollectionNode, RenameCollectionNode, SaveDraftRequest,
};
use lynx_storage::models::api_studio::{ApiStudioDraft, CollectionNode, HistoryEntry};
use serde::Deserialize;

use crate::error::{CoreError, CoreResult};
use crate::self_service::RouteState;

fn studio(state: &RouteState) -> ApiStudioStore {
    ApiStudioStore::new(state.store.clone())
}

fn map_err(err: ApiStudioError) -> CoreError {
    match err {
        ApiStudioError::Validation(message) => CoreError::Validation { message },
        ApiStudioError::NotFound(message) => CoreError::NotFound { message },
        ApiStudioError::Conflict(message) => CoreError::Conflict { message },
        ApiStudioError::Storage(source) => CoreError::Io {
            operation: "api_studio_storage",
            source,
        },
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct HistoryListQuery {
    limit: Option<usize>,
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CollectionListResponse {
    nodes: Vec<CollectionNode>,
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct HistoryListResponse {
    entries: Vec<HistoryEntry>,
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ClearHistoryResponse {
    deleted: u64,
}

pub async fn list_collections(
    State(state): State<RouteState>,
) -> CoreResult<Json<CollectionListResponse>> {
    let nodes = studio(&state)
        .list_collection_nodes()
        .await
        .map_err(map_err)?;
    Ok(Json(CollectionListResponse { nodes }))
}

pub async fn create_collection_node(
    State(state): State<RouteState>,
    Json(body): Json<CreateCollectionNode>,
) -> CoreResult<(StatusCode, Json<CollectionNode>)> {
    let node = studio(&state)
        .create_collection_node(body)
        .await
        .map_err(map_err)?;
    Ok((StatusCode::CREATED, Json(node)))
}

pub async fn rename_collection_node(
    State(state): State<RouteState>,
    Path(id): Path<String>,
    Json(body): Json<RenameCollectionNode>,
) -> CoreResult<Json<CollectionNode>> {
    let node = studio(&state)
        .rename_collection_node(&id, body)
        .await
        .map_err(map_err)?;
    Ok(Json(node))
}

pub async fn move_collection_node(
    State(state): State<RouteState>,
    Path(id): Path<String>,
    Json(body): Json<MoveCollectionNode>,
) -> CoreResult<Json<CollectionNode>> {
    let node = studio(&state)
        .move_collection_node(&id, body)
        .await
        .map_err(map_err)?;
    Ok(Json(node))
}

pub async fn delete_collection_node(
    State(state): State<RouteState>,
    Path(id): Path<String>,
) -> CoreResult<StatusCode> {
    let deleted = studio(&state)
        .delete_collection_node(&id)
        .await
        .map_err(map_err)?;
    if deleted {
        Ok(StatusCode::NO_CONTENT)
    } else {
        Err(CoreError::NotFound {
            message: format!("collection node {id}"),
        })
    }
}

pub async fn get_draft(
    State(state): State<RouteState>,
    Path(id): Path<String>,
) -> CoreResult<Json<ApiStudioDraft>> {
    let draft = studio(&state)
        .get_draft(&id)
        .await
        .map_err(map_err)?
        .ok_or_else(|| CoreError::NotFound {
            message: format!("draft {id}"),
        })?;
    Ok(Json(draft))
}

pub async fn save_draft(
    State(state): State<RouteState>,
    Path(id): Path<String>,
    Json(body): Json<SaveDraftRequest>,
) -> CoreResult<Json<ApiStudioDraft>> {
    let draft = studio(&state)
        .save_draft(&id, body)
        .await
        .map_err(map_err)?;
    Ok(Json(draft))
}

pub async fn list_history(
    State(state): State<RouteState>,
    Query(query): Query<HistoryListQuery>,
) -> CoreResult<Json<HistoryListResponse>> {
    let entries = studio(&state)
        .list_history(HistoryListParams {
            limit: query.limit,
        })
        .await
        .map_err(map_err)?;
    Ok(Json(HistoryListResponse { entries }))
}

pub async fn append_history(
    State(state): State<RouteState>,
    Json(body): Json<CreateHistoryEntry>,
) -> CoreResult<(StatusCode, Json<HistoryEntry>)> {
    let entry = studio(&state)
        .append_history(body)
        .await
        .map_err(map_err)?;
    Ok((StatusCode::CREATED, Json(entry)))
}

pub async fn delete_history_entry(
    State(state): State<RouteState>,
    Path(id): Path<String>,
) -> CoreResult<StatusCode> {
    let deleted = studio(&state)
        .delete_history_entry(&id)
        .await
        .map_err(map_err)?;
    if deleted {
        Ok(StatusCode::NO_CONTENT)
    } else {
        Err(CoreError::NotFound {
            message: format!("history entry {id}"),
        })
    }
}

pub async fn clear_history(State(state): State<RouteState>) -> CoreResult<Json<ClearHistoryResponse>> {
    let deleted = studio(&state).clear_history().await.map_err(map_err)?;
    Ok(Json(ClearHistoryResponse { deleted }))
}
