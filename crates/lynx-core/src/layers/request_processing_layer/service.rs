use super::handler_trait::{HandleRequestType, HandlerTrait};
use crate::{
    common::Req,
    error::CoreError,
    layers::{extend_extension_layer::DataStoreExtensionsExt, trace_id_layer::service::TraceIdExt},
};
use anyhow::Result;
use axum::response::Response;
use lynx_storage::dao::request_processing_dao::{
    RequestProcessingDao, handlers::handler_rule::HandlerRuleType,
};
use std::{future::Future, pin::Pin, task::Poll};
use tower::Service;
use tracing::instrument;

fn handler_kind_label(handler_type: &HandlerRuleType) -> &'static str {
    match handler_type {
        HandlerRuleType::Block(_) => "block",
        HandlerRuleType::LocalFile(_) => "local_file",
        HandlerRuleType::ModifyRequest(_) => "modify_request",
        HandlerRuleType::ModifyResponse(_) => "modify_response",
        HandlerRuleType::ProxyForward(_) => "proxy_forward",
        HandlerRuleType::HtmlScriptInjector(_) => "html_script_injector",
        HandlerRuleType::Delay(_) => "delay",
        HandlerRuleType::Throttle(_) => "throttle",
    }
}

fn handler_rule_error<E>(handler_name: &str, handler_type: &HandlerRuleType, err: CoreError) -> E
where
    E: From<anyhow::Error>,
{
    E::from(anyhow::Error::from(CoreError::as_request_rule_failed(
        handler_name,
        handler_kind_label(handler_type),
        err,
    )))
}

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
    S: Service<Req, Future: Future + Send + 'static, Response = Response>
        + Clone
        + Send
        + Sync
        + 'static,
    S::Error: From<anyhow::Error>,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn poll_ready(&mut self, cx: &mut std::task::Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.service.poll_ready(cx)
    }

    #[instrument(skip_all, name = "request_processing_service")]
    fn call(&mut self, request: Req) -> Self::Future {
        let store = request.extensions().get_data_store();
        let trace_id = request.extensions().get_trace_id();

        let mut inner = self.service.clone();
        Box::pin(async move {
            tracing::trace!(
                "Starting request processing, method: {}, uri: {}",
                request.method(),
                request.uri()
            );

            let dao = RequestProcessingDao::new(store.clone());
            tracing::trace!("Searching for matching rules for request");
            let matching_rules = match dao.find_matching_rules(&request).await {
                Ok(rules) => {
                    tracing::trace!("Found {} matching rules", rules.len());
                    rules
                }
                Err(e) => {
                    tracing::warn!("Failed to find matching rules: {}", e);
                    tracing::trace!("Bypassing request processing due to rule lookup failure");
                    return inner.call(request).await;
                }
            };

            if matching_rules.is_empty() {
                tracing::trace!("No matching rules found, proceeding with original request");
                return inner.call(request).await;
            }

            let mut all_handlers = Vec::new();

            for rule in &matching_rules {
                tracing::trace!(
                    "Processing rule: '{}', enabled: {}",
                    rule.name,
                    rule.enabled
                );
                if rule.enabled {
                    for handler in &rule.handlers {
                        tracing::trace!(
                            "Processing handler: type={}, enabled: {}, execution_order: {}",
                            handler_kind_label(&handler.handler_type),
                            handler.enabled,
                            handler.execution_order
                        );
                        if handler.enabled {
                            all_handlers.push(handler);
                        }
                    }
                }
            }

            all_handlers.sort_by_key(|h| h.execution_order);
            tracing::trace!(
                "Collected {} enabled handlers for execution",
                all_handlers.len()
            );

            let mut current_request = request;

            for (index, handler) in all_handlers.iter().enumerate() {
                tracing::trace!(
                    "Executing handler {}/{}: type={} (raw: {:?})",
                    index + 1,
                    all_handlers.len(),
                    handler_kind_label(&handler.handler_type),
                    handler.handler_type
                );

                let handler_result = match &handler.handler_type {
                    HandlerRuleType::Block(block_handler_config) => {
                        tracing::trace!("Executing block handler");
                        block_handler_config.handle_request(current_request).await
                    }
                    HandlerRuleType::LocalFile(local_file_config) => {
                        tracing::trace!("Executing local file handler");
                        local_file_config.handle_request(current_request).await
                    }
                    HandlerRuleType::ModifyRequest(modify_request_config) => {
                        tracing::trace!("Executing modify request handler");
                        modify_request_config.handle_request(current_request).await
                    }
                    HandlerRuleType::ModifyResponse(modify_response_config) => {
                        tracing::trace!("Executing modify response handler");
                        modify_response_config.handle_request(current_request).await
                    }
                    HandlerRuleType::ProxyForward(proxy_forward_config) => {
                        tracing::trace!("Executing proxy forward handler");
                        proxy_forward_config.handle_request(current_request).await
                    }
                    HandlerRuleType::HtmlScriptInjector(html_script_injector_config) => {
                        tracing::trace!("Executing HTML script injector handler");
                        html_script_injector_config
                            .handle_request(current_request)
                            .await
                    }
                    HandlerRuleType::Delay(delay_config) => {
                        tracing::trace!(
                            "Executing delay handler (delay: {}ms, variance: {:?}ms)",
                            delay_config.delay_ms,
                            delay_config.variance_ms
                        );
                        delay_config.handle_request(current_request).await
                    }
                    HandlerRuleType::Throttle(throttle_config) => {
                        tracing::trace!(
                            "Executing throttle handler (preset: {:?})",
                            throttle_config.preset
                        );
                        throttle_config.handle_request(current_request).await
                    }
                };

                match handler_result {
                    Ok(HandleRequestType::Request(req)) => {
                        tracing::trace!("Handler modified request, continuing with next handler");
                        current_request = req;
                    }
                    Ok(HandleRequestType::Response(mut response)) => {
                        tracing::trace!(
                            "Handler returned a response (status: {}), short-circuiting",
                            response.status()
                        );
                        response.extensions_mut().insert(trace_id.clone());
                        return Ok(response);
                    }
                    Err(e) => {
                        tracing::warn!(
                            "Handler failed (type={}): {}",
                            handler_kind_label(&handler.handler_type),
                            e
                        );
                        return Err(handler_rule_error(
                            handler_kind_label(&handler.handler_type),
                            &handler.handler_type,
                            e,
                        ));
                    }
                }
            }

            tracing::trace!("All handlers executed successfully, proceeding with modified request");
            let mut response = inner.call(current_request).await?;

            if !all_handlers.is_empty() {
                tracing::trace!(
                    "Processing response with {} response handlers",
                    all_handlers.len()
                );

                for (index, handler) in all_handlers.iter().enumerate() {
                    tracing::trace!(
                        "Executing response handler {}/{}: type={} (raw: {:?})",
                        index + 1,
                        all_handlers.len(),
                        handler_kind_label(&handler.handler_type),
                        handler.handler_type
                    );

                    match &handler.handler_type {
                        HandlerRuleType::ModifyResponse(modify_response_config) => {
                            tracing::trace!("Executing modify response handler");
                            response = modify_response_config
                                .handle_response(response)
                                .await
                                .map_err(|e| {
                                    handler_rule_error(
                                        handler_kind_label(&handler.handler_type),
                                        &handler.handler_type,
                                        e,
                                    )
                                })?;
                        }
                        HandlerRuleType::HtmlScriptInjector(html_script_injector_config) => {
                            tracing::trace!("Executing HTML script injector response handler");
                            response = html_script_injector_config
                                .handle_response(response)
                                .await
                                .map_err(|e| {
                                    handler_rule_error(
                                        handler_kind_label(&handler.handler_type),
                                        &handler.handler_type,
                                        e,
                                    )
                                })?;
                        }
                        HandlerRuleType::Delay(delay_config) => {
                            tracing::trace!(
                                "Executing delay response handler (type: {:?})",
                                delay_config.delay_type
                            );
                            response =
                                delay_config.handle_response(response).await.map_err(|e| {
                                    handler_rule_error(
                                        handler_kind_label(&handler.handler_type),
                                        &handler.handler_type,
                                        e,
                                    )
                                })?;
                        }
                        HandlerRuleType::Throttle(throttle_config) => {
                            tracing::trace!(
                                "Executing throttle response handler (preset: {:?})",
                                throttle_config.preset
                            );
                            response =
                                throttle_config
                                    .handle_response(response)
                                    .await
                                    .map_err(|e| {
                                        handler_rule_error(
                                            handler_kind_label(&handler.handler_type),
                                            &handler.handler_type,
                                            e,
                                        )
                                    })?;
                        }
                        _ => {
                            tracing::trace!("Handler type does not support response processing");
                            continue;
                        }
                    };
                }
            }

            response.extensions_mut().insert(trace_id.clone());

            Ok(response)
        })
    }
}
