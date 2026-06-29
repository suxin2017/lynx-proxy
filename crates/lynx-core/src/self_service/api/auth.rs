use axum::Json;
use axum::Router;
use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::routing::{get, post};
use serde::{Deserialize, Serialize};

use crate::self_service::RouteState;
use crate::self_service::auth::extract_bearer_token;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LoginRequest {
    username: String,
    password: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct LoginResponse {
    token: String,
    expires_at: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AuthStatusResponse {
    enabled: bool,
    authed: bool,
}

async fn login(
    State(RouteState { auth, .. }): State<RouteState>,
    Json(body): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, StatusCode> {
    if !auth.enabled {
        return Err(StatusCode::NOT_FOUND);
    }

    if body.username != auth.username || !auth.verify_password(&body.password) {
        return Err(StatusCode::UNAUTHORIZED);
    }

    let (token, expires_at) = auth
        .issue_token(&auth.username)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(LoginResponse { token, expires_at }))
}

async fn status(
    State(RouteState { auth, .. }): State<RouteState>,
    headers: HeaderMap,
) -> Json<AuthStatusResponse> {
    let authed = if !auth.enabled {
        true
    } else {
        extract_bearer_token(&headers).is_some_and(|token| auth.validate_token(&token).is_ok())
    };

    Json(AuthStatusResponse {
        enabled: auth.enabled,
        authed,
    })
}

pub fn router() -> Router<RouteState> {
    Router::new()
        .route("/login", post(login))
        .route("/status", get(status))
}
