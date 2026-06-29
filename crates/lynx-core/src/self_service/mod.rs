use std::net::SocketAddr;
use std::sync::Arc;

use crate::adb::AdbManager;
use crate::client::ReqwestClient;
use crate::client::request_client::RequestClientExt;
use crate::common::Req;
use crate::layers::extend_extension_layer::DataStoreExtensionsExt;
use crate::layers::message_package_layer::MessageEventChannel;
use crate::layers::message_package_layer::MessageEventLayerExt;
use crate::layers::message_package_layer::message_event_store::MessageEventCache;
use crate::layers::message_package_layer::message_event_store::MessageEventStoreExtensionsExt;
use crate::proxy_server::StaticDir;
use crate::proxy_server::listen_info::ProxyListenInfoExtensionsExt;
use crate::proxy_server::server_config::ProxyServerConfig;
use crate::proxy_server::server_config::ProxyServerConfigExtensionsExt;
use anyhow::Result;
use api::{api_studio, auth as auth_api, base_info, certificate, net_request};
use auth::{authorize_http, is_public_http_path, unauthorized_response};
use axum::Router;
use axum::response::Response;
use axum::routing::get;
use file_service::get_file;
use http::Method;
use tower::ServiceExt;
pub mod api;
pub mod auth;
pub mod auth_extensions;
pub mod file_service;
pub mod utils;

pub use auth::AuthConfig;
pub use auth_extensions::AuthConfigExtensionsExt;
#[cfg(not(debug_assertions))]
use http::header::HeaderValue;
#[cfg(not(debug_assertions))]
use tower_http::cors::AllowOrigin;
#[cfg(debug_assertions)]
use tower_http::cors::Any;
use tower_http::cors::CorsLayer;

pub const SELF_SERVICE_PATH_PREFIX: &str = "/api";

/// Permissive CORS only in debug builds (local dev). Release builds restrict to own origins.
fn cors_layer(access_addr_list: &[SocketAddr]) -> CorsLayer {
    let base = CorsLayer::new()
        .allow_methods([
            Method::GET,
            Method::PUT,
            Method::POST,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([http::header::AUTHORIZATION, http::header::CONTENT_TYPE]);

    #[cfg(debug_assertions)]
    {
        let _ = access_addr_list;
        base.allow_origin(Any)
    }

    #[cfg(not(debug_assertions))]
    {
        let origins = access_addr_list
            .iter()
            .filter_map(|addr| HeaderValue::from_str(&format!("http://{addr}")).ok())
            .collect::<Vec<_>>();

        if origins.is_empty() {
            base.allow_origin(AllowOrigin::predicate(|_, _| false))
        } else {
            base.allow_origin(AllowOrigin::list(origins))
        }
    }
}

pub fn is_self_service(req: &Req) -> bool {
    let access_addr_list = req.extensions().get::<Arc<Vec<SocketAddr>>>();

    access_addr_list
        .map(|list| {
            list.iter().any(|addr| {
                req.headers().get("host").is_some_and(|host| {
                    if let Ok(host) = host.to_str() {
                        let host_ip = if host.starts_with("localhost") {
                            "127.0.0.1"
                        } else {
                            host.split(':').next().unwrap_or(host)
                        };
                        let host_port = if host.contains(':') {
                            host.split(':').nth(1).unwrap_or("80")
                        } else {
                            "80"
                        };
                        let host = format!("{}:{}", host_ip, host_port);
                        host == addr.to_string()
                    } else {
                        false
                    }
                })
            })
        })
        .unwrap_or(false)
}

async fn get_health() -> &'static str {
    "ok"
}

#[derive(Clone)]
pub struct RouteState {
    pub store: Arc<lynx_storage::DataStore>,
    pub net_request_cache: Arc<MessageEventCache>,
    pub proxy_config: Arc<ProxyServerConfig>,
    pub access_addr_list: Arc<Vec<SocketAddr>>,
    pub static_dir: Option<Arc<StaticDir>>,
    pub client: Arc<ReqwestClient>,
    pub message_event_channel: Arc<MessageEventChannel>,
    pub auth: Arc<AuthConfig>,
    pub adb: Arc<AdbManager>,
}

pub async fn self_service_router(req: Req) -> Result<Response> {
    let static_dir = req.extensions().get::<Option<Arc<StaticDir>>>();
    let auth = req.extensions().get_auth_config();

    let store = req.extensions().get_data_store();
    let listen_info = req.extensions().get_proxy_listen_info();
    let adb = Arc::new(AdbManager::new(store.root(), listen_info.local_only));

    let state = RouteState {
        store,
        net_request_cache: req.extensions().get_message_event_store(),
        proxy_config: req.extensions().get_proxy_server_config(),
        access_addr_list: req
            .extensions()
            .get::<Arc<Vec<SocketAddr>>>()
            .expect("access_addr_list not found")
            .clone(),
        static_dir: static_dir.cloned().flatten(),
        client: req.extensions().get_reqwest_client(),
        message_event_channel: req.extensions().get_message_event_cannel(),
        auth: auth.clone(),
        adb,
    };

    let method = req.method().clone();
    let uri = req.uri().clone();
    let path = uri.path().to_string();
    let headers = req.headers().clone();

    // Only require auth for API endpoints; static files (JS, CSS, HTML, images)
    // must be accessible without authentication so the login page can load.
    if auth.enabled
        && path.starts_with("/api/")
        && !is_public_http_path(&method, &path)
        && !authorize_http(&auth, &method, &path, &uri, &headers)
    {
        return Ok(unauthorized_response());
    }

    let cors = cors_layer(&state.access_addr_list);

    let api_router = Router::new()
        .route("/health", get(get_health))
        .nest("/auth", auth_api::router())
        .nest("/net_request", net_request::router())
        .nest("/certificate", certificate::router())
        .nest("/base_info", base_info::router())
        .nest("/api_studio", api_studio::router())
        .layer(cors)
        .with_state(state.clone());

    let router = Router::new()
        .nest(SELF_SERVICE_PATH_PREFIX, api_router)
        .fallback(get_file)
        .with_state(state);

    router
        .oneshot(req)
        .await
        .map_err(|e| anyhow::anyhow!(e).context("Error handling request"))
}
