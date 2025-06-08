use super::{
    error::{RequestProcessingError, Result},
    handlers::HandlerRule,
    types::{CaptureCondition, CaptureRule, RequestRule, SimpleCaptureCondition},
};
use crate::entities::capture::CaptureType;
use glob::Pattern;
use regex::Regex;
use std::collections::HashSet;

/// Validator for request processing rules
pub struct RuleValidator;

impl RuleValidator {
    /// Validate a complete request rule
    pub fn validate_rule(rule: &RequestRule) -> Result<()> {
        // Validate basic rule properties
        Self::validate_rule_name(&rule.name)?;
        Self::validate_priority(rule.priority)?;

        // Validate capture rule
        Self::validate_capture_rule(&rule.capture)?;

        // Validate handlers
        Self::validate_handlers(&rule.handlers)?;

        Ok(())
    }

    /// Validate rule name
    pub fn validate_rule_name(name: &str) -> Result<()> {
        if name.trim().is_empty() {
            return Err(RequestProcessingError::RuleValidation {
                reason: "Rule name cannot be empty".to_string(),
            });
        }

        if name.len() > 255 {
            return Err(RequestProcessingError::RuleValidation {
                reason: "Rule name cannot exceed 255 characters".to_string(),
            });
        }

        Ok(())
    }

    /// Validate rule priority
    pub fn validate_priority(priority: i32) -> Result<()> {
        if priority < 0 {
            return Err(RequestProcessingError::RuleValidation {
                reason: "Rule priority cannot be negative".to_string(),
            });
        }

        if priority > 10000 {
            return Err(RequestProcessingError::RuleValidation {
                reason: "Rule priority cannot exceed 10000".to_string(),
            });
        }

        Ok(())
    }

    /// Validate capture rule
    pub fn validate_capture_rule(capture: &CaptureRule) -> Result<()> {
        Self::validate_capture_condition(&capture.condition)
    }

    /// Validate capture condition recursively
    pub fn validate_capture_condition(condition: &CaptureCondition) -> Result<()> {
        match condition {
            CaptureCondition::Simple(simple) => Self::validate_simple_condition(simple),
            CaptureCondition::Complex(complex) => {
                if complex.conditions.is_empty() {
                    return Err(RequestProcessingError::RuleValidation {
                        reason: "Complex capture rule must have at least one condition".to_string(),
                    });
                }

                // Validate all sub-conditions
                for sub_condition in &complex.conditions {
                    Self::validate_capture_condition(sub_condition)?;
                }

                Ok(())
            }
        }
    }

    /// Validate simple capture condition
    pub fn validate_simple_condition(condition: &SimpleCaptureCondition) -> Result<()> {
        // Check if at least one field is not empty/None
        let has_url_pattern = condition.url_pattern.is_some();
        let has_method = condition
            .method
            .as_ref()
            .is_some_and(|m| !m.trim().is_empty());
        let has_host = condition
            .host
            .as_ref()
            .is_some_and(|h| !h.trim().is_empty());
        let has_headers = condition.headers.as_ref().is_some_and(|headers| {
            !headers.is_empty()
                && headers.iter().any(|h| {
                    h.iter()
                        .any(|(k, v)| !k.trim().is_empty() || !v.trim().is_empty())
                })
        });

        if !has_url_pattern && !has_method && !has_host && !has_headers {
            return Err(RequestProcessingError::RuleValidation {
                reason: "At least one condition field (url_pattern, method, host, or headers) must be specified".to_string(),
            });
        }

        // Validate url_pattern if provided
        if let Some(ref url_pattern) = condition.url_pattern {
            // Validate pattern based on capture type
            match url_pattern.capture_type {
                CaptureType::Glob => {
                    Pattern::new(&url_pattern.pattern).map_err(|e| {
                        RequestProcessingError::InvalidCapturePattern {
                            pattern: url_pattern.pattern.clone(),
                            reason: format!("Invalid glob pattern: {}", e),
                        }
                    })?;
                }
                CaptureType::Regex => {
                    Regex::new(&url_pattern.pattern).map_err(|e| {
                        RequestProcessingError::InvalidCapturePattern {
                            pattern: url_pattern.pattern.clone(),
                            reason: format!("Invalid regex pattern: {}", e),
                        }
                    })?;
                }
                CaptureType::Exact | CaptureType::Contains => {
                    // No validation needed for exact or contains patterns
                }
            }

            // Validate pattern is not empty
            if url_pattern.pattern.trim().is_empty() {
                return Err(RequestProcessingError::InvalidCapturePattern {
                    pattern: url_pattern.pattern.clone(),
                    reason: "Pattern cannot be empty".to_string(),
                });
            }
        }

        // Validate method if specified
        if let Some(ref method) = condition.method {
            if !method.trim().is_empty() {
                Self::validate_http_method(method)?;
            }
        }

        // Validate host if specified
        if let Some(ref host) = condition.host {
            if !host.trim().is_empty() {
                Self::validate_host(host)?;
            }
        }

        Ok(())
    }

    /// Validate HTTP method
    pub fn validate_http_method(method: &str) -> Result<()> {
        let valid_methods = [
            "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS", "TRACE",
        ];

        if !valid_methods.contains(&method.to_uppercase().as_str()) {
            return Err(RequestProcessingError::RuleValidation {
                reason: format!("Invalid HTTP method: {}", method),
            });
        }

        Ok(())
    }

    /// Validate host
    pub fn validate_host(host: &str) -> Result<()> {
        // Basic host validation - allow wildcards and subdomains
        if host.contains("..") {
            return Err(RequestProcessingError::RuleValidation {
                reason: "Host cannot contain consecutive dots".to_string(),
            });
        }

        if host.starts_with('.') || host.ends_with('.') {
            return Err(RequestProcessingError::RuleValidation {
                reason: "Host cannot start or end with a dot".to_string(),
            });
        }

        Ok(())
    }

    /// Validate handlers
    pub fn validate_handlers(handlers: &[HandlerRule]) -> Result<()> {
        if handlers.is_empty() {
            return Err(RequestProcessingError::RuleValidation {
                reason: "Rule must have at least one handler".to_string(),
            });
        }

        // Check for duplicate execution orders
        let mut orders = HashSet::new();
        for handler in handlers {
            if !orders.insert(handler.execution_order) {
                return Err(RequestProcessingError::RuleValidation {
                    reason: format!("Duplicate execution order: {}", handler.execution_order),
                });
            }

            Self::validate_handler(handler)?;
        }

        Ok(())
    }

    /// Validate individual handler
    pub fn validate_handler(handler: &HandlerRule) -> Result<()> {
        // Validate handler name
        if handler.name.trim().is_empty() {
            return Err(RequestProcessingError::RuleValidation {
                reason: "Handler name cannot be empty".to_string(),
            });
        }

        // Validate execution order
        if handler.execution_order < 0 {
            return Err(RequestProcessingError::RuleValidation {
                reason: "Handler execution order cannot be negative".to_string(),
            });
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_rule_name() {
        assert!(RuleValidator::validate_rule_name("Valid Rule").is_ok());
        assert!(RuleValidator::validate_rule_name("").is_err());
        assert!(RuleValidator::validate_rule_name("   ").is_err());

        let long_name = "a".repeat(256);
        assert!(RuleValidator::validate_rule_name(&long_name).is_err());
    }

    #[test]
    fn test_validate_priority() {
        assert!(RuleValidator::validate_priority(100).is_ok());
        assert!(RuleValidator::validate_priority(0).is_ok());
        assert!(RuleValidator::validate_priority(-1).is_err());
        assert!(RuleValidator::validate_priority(10001).is_err());
    }

    #[test]
    fn test_validate_http_method() {
        assert!(RuleValidator::validate_http_method("GET").is_ok());
        assert!(RuleValidator::validate_http_method("post").is_ok());
        assert!(RuleValidator::validate_http_method("INVALID").is_err());
    }
}
