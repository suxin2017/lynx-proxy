use serde::{Deserialize, Serialize};

use super::{
    BlockHandlerConfig, DelayHandlerConfig, DelayType, HtmlScriptInjectorConfig, LocalFileConfig, ModifyRequestConfig,
    ThrottleHandlerConfig, ThrottlePreset, modify_response_handler::ModifyResponseConfig,
    proxy_forward_handler::ProxyForwardConfig,
};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase", tag = "type")]
pub enum HandlerRuleType {
    Block(BlockHandlerConfig),
    ModifyRequest(ModifyRequestConfig),
    LocalFile(LocalFileConfig),
    ModifyResponse(ModifyResponseConfig),
    ProxyForward(ProxyForwardConfig),
    HtmlScriptInjector(HtmlScriptInjectorConfig),
    Delay(DelayHandlerConfig),
    Throttle(ThrottleHandlerConfig),
}

/// Handler rule configuration
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HandlerRule {
    pub id: Option<i32>,
    pub handler_type: HandlerRuleType,
    pub name: String,
    pub description: Option<String>,
    pub execution_order: i32,
    pub enabled: bool,
}

impl HandlerRule {
    pub fn block_handler(status_code: Option<u16>, reason: Option<String>) -> Self {
        Self {
            id: None,
            handler_type: HandlerRuleType::Block(BlockHandlerConfig {
                status_code,
                reason,
            }),
            name: "Block Access".to_string(),
            description: Some("Block all requests with 403 Forbidden".to_string()),
            execution_order: 100,
            enabled: true,
        }
    }

    pub fn local_file_handler(
        file_path: String,
        content_type: Option<String>,
        status_code: Option<u16>,
    ) -> Self {
        Self {
            id: None,
            handler_type: HandlerRuleType::LocalFile(LocalFileConfig {
                file_path,
                content_type,
                status_code,
            }),
            name: "Local File Handler".to_string(),
            description: Some("Serve local files from filesystem".to_string()),
            execution_order: 50,
            enabled: true,
        }
    }

    pub fn modify_request_handler(
        modify_headers: Option<std::collections::HashMap<String, String>>,
        modify_body: Option<String>,
        modify_method: Option<String>,
        modify_url: Option<String>,
    ) -> Self {
        Self {
            id: None,
            handler_type: HandlerRuleType::ModifyRequest(ModifyRequestConfig {
                modify_headers,
                modify_body,
                modify_method,
                modify_url,
            }),
            name: "Modify Request Handler".to_string(),
            description: Some("Modify request headers, body, method, or URL".to_string()),
            execution_order: 20,
            enabled: true,
        }
    }

    pub fn modify_response_handler(
        modify_headers: Option<std::collections::HashMap<String, String>>,
        modify_body: Option<String>,
        modify_method: Option<String>,
        modify_status_code: Option<u16>,
    ) -> Self {
        Self {
            id: None,
            handler_type: HandlerRuleType::ModifyResponse(ModifyResponseConfig {
                modify_headers,
                modify_body,
                modify_method,
                modify_status_code,
            }),
            name: "Modify Response Handler".to_string(),
            description: Some("Modify response headers, body, method, or status code".to_string()),
            execution_order: 80,
            enabled: true,
        }
    }

    pub fn proxy_forward_handler(
        target_scheme: Option<String>,
        target_authority: Option<String>,
        target_path: Option<String>,
    ) -> Self {
        Self {
            id: None,
            handler_type: HandlerRuleType::ProxyForward(ProxyForwardConfig {
                target_scheme,
                target_authority,
                target_path,
            }),
            name: "Proxy Forward Handler".to_string(),
            description: Some("Forward requests to specified proxy target".to_string()),
            execution_order: 10,
            enabled: true,
        }
    }

    pub fn html_script_injector_handler(
        content: Option<String>,
        injection_position: Option<String>,
    ) -> Self {
        Self {
            id: None,
            handler_type: HandlerRuleType::HtmlScriptInjector(HtmlScriptInjectorConfig {
                content,
                injection_position: injection_position.or(Some("body-end".to_string())),
            }),
            name: "HTML Content Injector Handler".to_string(),
            description: Some("Inject HTML content into HTML responses".to_string()),
            execution_order: 85,
            enabled: true,
        }
    }

    pub fn delay_handler(
        delay_ms: u64,
        variance_ms: Option<u64>,
        delay_type: DelayType,
    ) -> Self {
        Self {
            id: None,
            handler_type: HandlerRuleType::Delay(DelayHandlerConfig {
                delay_ms,
                variance_ms,
                delay_type,
            }),
            name: "Delay Handler".to_string(),
            description: Some("Add processing delay to requests".to_string()),
            execution_order: 5, // Execute early to delay before processing
            enabled: true,
        }
    }

    pub fn throttle_handler(preset: ThrottlePreset) -> Self {
        let (name, description) = match preset {
            ThrottlePreset::Fast3G => (
                "Throttle (Fast 3G)".to_string(),
                Some("Simulate Fast 3G network (Chrome DevTools preset)".to_string()),
            ),
            ThrottlePreset::Slow3G => (
                "Throttle (Slow 3G)".to_string(),
                Some("Simulate Slow 3G network (Chrome DevTools preset)".to_string()),
            ),
            ThrottlePreset::Offline => (
                "Throttle (Offline)".to_string(),
                Some("Simulate offline network — block requests".to_string()),
            ),
            ThrottlePreset::Custom => (
                "Throttle (Custom)".to_string(),
                Some("Custom network throttling (latency + bandwidth)".to_string()),
            ),
        };
        Self {
            id: None,
            handler_type: HandlerRuleType::Throttle(ThrottleHandlerConfig {
                preset,
                download_kbps: None,
                upload_kbps: None,
                latency_ms: None,
            }),
            name,
            description,
            execution_order: 5,
            enabled: true,
        }
    }
}

impl Default for HandlerRule {
    fn default() -> Self {
        Self {
            id: None,
            handler_type: HandlerRuleType::Block(BlockHandlerConfig {
                status_code: Some(403),
                reason: Some("block".to_string()),
            }),
            name: "Default Handler".to_string(),
            description: None,
            execution_order: 0,
            enabled: true,
        }
    }
}
