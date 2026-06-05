mod handlers;

use axum::Router;
use axum::routing::{delete, get, post};

use crate::self_service::RouteState;

pub fn router() -> Router<RouteState> {
    Router::new()
        .route("/collections", get(handlers::list_collections))
        .route("/collections/nodes", post(handlers::create_collection_node))
        .route(
            "/collections/nodes/{id}",
            delete(handlers::delete_collection_node),
        )
        .route(
            "/collections/nodes/{id}/rename",
            post(handlers::rename_collection_node),
        )
        .route(
            "/collections/nodes/{id}/move",
            post(handlers::move_collection_node),
        )
        .route("/drafts/{id}", get(handlers::get_draft).put(handlers::save_draft))
        .route("/history", get(handlers::list_history).post(handlers::append_history))
        .route("/history/clear", delete(handlers::clear_history))
        .route("/history/{id}", delete(handlers::delete_history_entry))
}
