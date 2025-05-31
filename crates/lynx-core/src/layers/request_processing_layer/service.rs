use super::handler_trait::{HandleRequestType, HandlerTrait};
use crate::{
    common::{Req, Res},
    layers::extend_extension_layer::DbExtensionsExt,
    utils::full,
};
use anyhow::Result;
use axum::{
    extract::{FromRequest, Request},
    response::Response,
};
use lynx_db::dao::request_processing_dao::{
    RequestProcessingDao, handlers::handler_rule::HandlerRuleType,
};
use std::{future::Future, pin::Pin, task::Poll};
use tower::Service;

#[derive(Clone)]
pub struct RequestProcessingService<S> {
    pub service: S,
}

impl<S> RequestProcessingService<S> {
    pub fn new(service: S) -> Self {
        Self { service }
    }
}

impl<S> Service<Req> for RequestProcessingService<S>
where
    S: Service<Req, Future: Future + Send + 'static, Response = Res, Error = anyhow::Error>
        + Clone
        + Send
        + Sync
        + 'static,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn poll_ready(&mut self, cx: &mut std::task::Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.service.poll_ready(cx)
    }

    fn call(&mut self, request: Req) -> Self::Future {
        let db = request.extensions().get_db();
        let mut inner = self.service.clone();

        Box::pin(async move {
            let dao = RequestProcessingDao::new(db.clone());
            // 查找匹配的规则
            let matching_rules = match dao.find_matching_rules(&request).await {
                Ok(rules) => rules,
                Err(e) => {
                    tracing::warn!("Failed to find matching rules: {}", e);
                    // 如果查找规则失败，直接继续处理请求
                    return inner.call(request).await;
                }
            };

            if matching_rules.is_empty() {
                return inner.call(request).await;
            }

            // 按优先级排序（已经在 find_matching_rules 中排序了）
            // 按执行顺序处理所有匹配的规则中的处理器
            let mut all_handlers = Vec::new();

            for rule in &matching_rules {
                if rule.enabled {
                    for handler in &rule.handlers {
                        if handler.enabled {
                            all_handlers.push(handler);
                        }
                    }
                }
            }

            // 按执行顺序排序
            all_handlers.sort_by_key(|h| h.execution_order);

            // 执行处理器
            let mut current_request = request;

            for handler in all_handlers {
                let handler_result = match &handler.handler_type {
                    HandlerRuleType::Block(block_handler_config) => {
                        block_handler_config.handle_request(current_request).await
                    }
                    _ => unimplemented!(),
                };

                match handler_result {
                    Ok(HandleRequestType::Request(req)) => {
                        current_request = req;
                    }
                    Ok(HandleRequestType::Response(response)) => {
                        // 如果处理器返回响应，直接返回该响应
                        return Ok(response);
                    }
                    Err(e) => {
                        tracing::warn!("Handler '{}' failed: {}", handler.name, e);
                        // 如果处理器失败，我们需要创建一个错误响应
                        let error_response = Response::builder()
                            .status(500)
                            .header("content-type", "text/plain")
                            .body(full(format!("Handler processing failed: {}", e)))
                            .unwrap_or_else(|_| Response::new(full("Internal server error")));
                        return Ok(error_response);
                    }
                }
            }

            // 所有处理器执行完毕后，继续处理请求
            inner.call(current_request).await
        })
    }
}
