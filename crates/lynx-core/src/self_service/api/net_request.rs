use axum::Router;

use crate::self_service::RouteState;

use super::net_request_ws;

pub fn router() -> Router<RouteState> {
    net_request_ws::router()
}
