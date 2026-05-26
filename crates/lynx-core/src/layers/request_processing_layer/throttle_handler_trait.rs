use axum::{
    body::Body,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use http_body_util::BodyExt;
use lynx_db::dao::request_processing_dao::handlers::ThrottleHandlerConfig;
use std::time::Duration;
use tokio::time::sleep;

use super::{
    handler_trait::{HandleRequestType, HandlerTrait},
    throttled_body::ThrottledBody,
};
use crate::{common::Req, error::CoreResult, utils::full};

#[async_trait::async_trait]
impl HandlerTrait for ThrottleHandlerConfig {
    async fn handle_request(&self, mut request: Req) -> CoreResult<HandleRequestType> {
        let effective = self.resolve_effective();

        if effective.offline {
            let response = Response::builder()
                .status(StatusCode::SERVICE_UNAVAILABLE)
                .header("content-type", "text/plain; charset=utf-8")
                .header("x-throttled-by", "lynx-proxy")
                .body(full("Network offline (simulated)"))?;
            return Ok(HandleRequestType::Response(response.into_response()));
        }

        if effective.latency_ms > 0 {
            sleep(Duration::from_millis(effective.latency_ms)).await;
        }

        if effective.upload_kbps > 0 {
            let body = std::mem::replace(request.body_mut(), crate::utils::empty());
            let throttled = ThrottledBody::new(body, effective.upload_kbps);
            *request.body_mut() = throttled.map_err(|e| e).boxed();
        }

        Ok(HandleRequestType::Request(request))
    }

    async fn handle_response(&self, mut response: Response) -> CoreResult<Response> {
        let effective = self.resolve_effective();

        if effective.offline || effective.download_kbps == 0 {
            return Ok(response);
        }

        let body = std::mem::replace(response.body_mut(), Body::empty());
        let boxed = body
            .map_err(|e| anyhow::anyhow!("{e}"))
            .boxed_unsync();
        let throttled = ThrottledBody::new(boxed, effective.download_kbps);
        *response.body_mut() = Body::new(throttled);

        Ok(response)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use anyhow::Result;
    use axum::http::Method;
    use http::Request;
    use http_body_util::BodyExt;
    use lynx_db::dao::request_processing_dao::handlers::ThrottlePreset;
    use std::time::Instant;

    #[tokio::test]
    async fn test_throttle_handler_offline() -> Result<()> {
        let handler = ThrottleHandlerConfig {
            preset: ThrottlePreset::Offline,
            ..Default::default()
        };

        let request = Request::builder()
            .method(Method::GET)
            .uri("http://example.com/test")
            .body(crate::utils::full("test"))?;

        let result = handler.handle_request(request).await?;
        match result {
            HandleRequestType::Response(response) => {
                assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
                let body = BodyExt::collect(response.into_body())
                    .await?
                    .to_bytes();
                assert_eq!(body, "Network offline (simulated)");
            }
            HandleRequestType::Request(_) => panic!("expected short-circuit response"),
        }
        Ok(())
    }

    #[tokio::test]
    async fn test_throttle_handler_latency() -> Result<()> {
        let handler = ThrottleHandlerConfig {
            preset: ThrottlePreset::Custom,
            download_kbps: None,
            upload_kbps: None,
            latency_ms: Some(100),
        };

        let request = Request::builder()
            .method(Method::GET)
            .uri("http://example.com/test")
            .body(crate::utils::full("test"))?;

        let start = Instant::now();
        let result = handler.handle_request(request).await?;
        let elapsed = start.elapsed();

        assert!(elapsed >= Duration::from_millis(90));
        assert!(elapsed <= Duration::from_millis(250));
        match result {
            HandleRequestType::Request(_) => (),
            HandleRequestType::Response(_) => panic!("expected request passthrough"),
        }
        Ok(())
    }
}
