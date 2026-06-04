use super::{
    error::{RequestProcessingError, Result},
    handlers::HandlerRule,
    types::{CaptureRule, RequestRule},
};
use lynx_dsl::compile_match_expr;
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
        let expr = capture.match_expr.trim();
        if expr.is_empty() {
            return Err(RequestProcessingError::RuleValidation {
                reason: "matchExpr cannot be empty".to_string(),
            });
        }

        compile_match_expr(expr).map_err(|error| RequestProcessingError::RuleValidation {
            reason: format!("Invalid matchExpr: {error}"),
        })?;
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
