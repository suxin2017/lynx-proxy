use anyhow::Result;
use axum::response::{IntoResponse, Response};
use http::Uri;
use tower::{ServiceBuilder, ServiceExt, service_fn};
use tracing::instrument;

use crate::{
    client::request_client::RequestClientExt,
    common::Req,
    error::{CoreError, root_cause_message},
    layers::{
        build_proxy_request::BuildProxyRequestService,
        message_package_layer::ProxyMessageEventService,
        request_processing_layer::RequestProcessingService, trace_id_layer::service::TraceIdExt,
    },
};

pub fn is_http_req(req: &Req) -> bool {
    req.headers().get("Upgrade").is_none()
}

fn upstream_target_label(uri: &Uri) -> String {
    uri.authority()
        .map(|a| a.to_string())
        .unwrap_or_else(|| uri.to_string())
}

fn upstream_error_detail(err: &anyhow::Error) -> String {
    let mut parts = Vec::new();
    let mut current: Option<&dyn std::error::Error> = Some(err.as_ref());
    while let Some(e) = current {
        let msg = e.to_string();
        if !msg.is_empty() && !parts.contains(&msg) {
            parts.push(msg);
        }
        current = e.source();
    }
    parts.join(": ")
}

fn classify_upstream_error(uri: &Uri, err: anyhow::Error) -> CoreError {
    let target = upstream_target_label(uri);
    let chain_detail = upstream_error_detail(&err);
    let detail = if chain_detail.contains(&target) {
        chain_detail
    } else {
        format!("{chain_detail} ({target})")
    };
    let root_lower = root_cause_message(&err).to_lowercase();
    let chain_lower = detail.to_lowercase();

    if root_lower.contains("timeout")
        || chain_lower.contains("timeout")
        || chain_lower.contains("headers timeout")
    {
        return CoreError::Timeout {
            operation: "upstream request",
            source: anyhow::anyhow!(detail),
        };
    }

    if root_lower.contains("certificate")
        || root_lower.contains("tls")
        || root_lower.contains("ssl")
        || chain_lower.contains("tls")
        || chain_lower.contains("certificate")
        || chain_lower.contains("handshake")
    {
        return CoreError::Tls {
            operation: "upstream TLS handshake",
            source: anyhow::anyhow!(detail),
        };
    }

    CoreError::Network {
        operation: "upstream request",
        source: anyhow::anyhow!(detail),
    }
}

#[instrument(skip_all)]
async fn proxy_http_request_inner(req: Req) -> Result<Response> {
    let trace_id = req.extensions().get_trace_id().clone();
    let uri = req.uri().clone();
    let http_client = req
        .extensions()
        .try_get_http_client()
        .map_err(anyhow::Error::from)?;
    http_client
        .request(req)
        .await
        .map_err(|e| anyhow::Error::from(classify_upstream_error(&uri, e)))
        .map(|mut res| {
            res.extensions_mut().insert(trace_id);
            res
        })
        .map(|res| res.into_response())
}

#[instrument(skip_all)]
pub async fn proxy_http_request(req: Req) -> Result<Response> {
    let svc = service_fn(proxy_http_request_inner);

    let svc = ServiceBuilder::new()
        .layer_fn(|s| BuildProxyRequestService { service: s })
        .layer_fn(|s| ProxyMessageEventService { service: s })
        .layer_fn(|s| RequestProcessingService { service: s })
        .service(svc);

    let res = svc.oneshot(req).await?;
    Ok(res.into_response())
}

#[cfg(test)]
mod tests {
    use super::*;
    use http::uri::Authority;

    #[test]
    fn classify_connection_refused_includes_target() {
        let uri = Uri::builder()
            .scheme("http")
            .authority(Authority::from_static("127.0.0.1:9090"))
            .path_and_query("/")
            .build()
            .unwrap();
        let err = classify_upstream_error(
            &uri,
            anyhow::anyhow!("connection refused").context("http request client error"),
        );
        assert_eq!(err.status_code(), http::StatusCode::BAD_GATEWAY);
        assert!(err.public_message().contains("127.0.0.1:9090"));
        assert!(err.public_message().contains("connection refused"));
    }

    #[test]
    fn classify_timeout_as_request_timeout() {
        let uri = Uri::builder()
            .scheme("http")
            .authority(Authority::from_static("example.com"))
            .path_and_query("/")
            .build()
            .unwrap();
        let err = classify_upstream_error(
            &uri,
            anyhow::anyhow!("Request headers timeout after 30s"),
        );
        assert_eq!(err.status_code(), http::StatusCode::REQUEST_TIMEOUT);
        assert_eq!(err.category(), "timeout");
    }
}
