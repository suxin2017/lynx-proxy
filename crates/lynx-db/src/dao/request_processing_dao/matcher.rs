use super::{
    error::RequestProcessingError,
    common::HeaderUtils,
    types::{CaptureCondition, CaptureRule, LogicalOperator, RequestRule, SimpleCaptureCondition},
};
use crate::entities::capture::CaptureType;
use anyhow::Result;
use axum::{body::HttpBody, extract::Request};
use glob::Pattern;
use regex::Regex;
use std::collections::HashMap;
use std::sync::{Arc, RwLock};

/// Compiled pattern for efficient matching
#[derive(Debug, Clone)]
pub enum CompiledPattern {
    Glob(Pattern),
    Regex(Regex),
    Exact(String),
    Contains(String),
}

impl CompiledPattern {
    pub fn matches(&self, text: &str) -> bool {
        match self {
            CompiledPattern::Glob(pattern) => pattern.matches(text),
            CompiledPattern::Regex(regex) => regex.is_match(text),
            CompiledPattern::Exact(exact) => exact == text,
            CompiledPattern::Contains(contains) => text.contains(contains),
        }
    }
}

/// Compiled capture condition for efficient matching
#[derive(Debug, Clone)]
pub struct CompiledCaptureCondition {
    pub pattern: CompiledPattern,
    pub method: Option<String>,
    pub host: Option<String>,
    pub headers: Option<Vec<HashMap<String, String>>>,
}

/// Compiled capture rule
#[derive(Debug, Clone)]
pub enum CompiledCaptureRule {
    Simple(CompiledCaptureCondition),
    Complex {
        operator: LogicalOperator,
        conditions: Vec<CompiledCaptureRule>,
    },
}

/// Compiled request rule for efficient matching
#[derive(Debug, Clone)]
pub struct CompiledRequestRule {
    pub id: Option<i32>,
    pub name: String,
    pub enabled: bool,
    pub priority: i32,
    pub capture: CompiledCaptureRule,
    pub original_rule: RequestRule,
}

/// Cache for compiled rules
type RuleCache = Arc<RwLock<HashMap<i32, CompiledRequestRule>>>;

/// Enhanced rule matcher with performance optimizations and caching
pub struct RuleMatcher {
    cache: RuleCache,
}

impl RuleMatcher {
    pub fn new() -> Self {
        Self {
            cache: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Find matching rules for a request with optimized performance
    pub fn find_matching_rules<T: HttpBody>(
        &self,
        rules: &[RequestRule],
        request: &Request<T>,
    ) -> Result<Vec<RequestRule>> {
        // Compile rules with caching
        let compiled_rules = self.compile_rules(rules)?;

        let mut matching_rules = Vec::new();

        for compiled_rule in compiled_rules {
            if !compiled_rule.enabled {
                continue;
            }

            // Check if the capture rule matches
            if Self::compiled_capture_matches(&compiled_rule.capture, request)? {
                matching_rules.push(compiled_rule.original_rule);
            }
        }

        // Sort by priority (higher priority first)
        matching_rules.sort_by(|a, b| b.priority.cmp(&a.priority));
        Ok(matching_rules)
    }

    /// Check if a capture rule matches the request
    pub fn capture_matches(&self, capture: &CaptureRule, request: &Request) -> Result<bool> {
        let compiled_condition = Self::compile_capture_condition(&capture.condition)?;
        Self::compiled_capture_matches(&compiled_condition, request)
    }

    /// Evaluate a capture condition against a request
    pub fn evaluate_condition(
        &self,
        condition: &CaptureCondition,
        request: &Request,
    ) -> Result<bool> {
        let compiled_condition = Self::compile_capture_condition(condition)?;
        Self::compiled_capture_matches(&compiled_condition, request)
    }

    /// Clear the rule cache
    pub fn clear_cache(&self) {
        let mut cache = self.cache.write().unwrap();
        cache.clear();
    }

    /// Remove a specific rule from cache
    pub fn invalidate_rule(&self, rule_id: i32) {
        let mut cache = self.cache.write().unwrap();
        cache.remove(&rule_id);
    }

    /// Compile and cache rules for efficient matching
    fn compile_rules(&self, rules: &[RequestRule]) -> Result<Vec<CompiledRequestRule>> {
        let mut compiled_rules = Vec::new();
        let mut cache = self.cache.write().unwrap();

        for rule in rules {
            let rule_id = rule.id.unwrap_or(-1);

            // Check if already cached
            if let Some(cached_rule) = cache.get(&rule_id) {
                // Simple check if rule has been modified
                if cached_rule.name == rule.name && cached_rule.priority == rule.priority {
                    compiled_rules.push(cached_rule.clone());
                    continue;
                }
            }

            // Compile the rule
            let compiled_rule = Self::compile_rule(rule)?;

            // Cache the compiled rule
            if rule_id >= 0 {
                cache.insert(rule_id, compiled_rule.clone());
            }

            compiled_rules.push(compiled_rule);
        }

        Ok(compiled_rules)
    }

    /// Compile a single rule
    fn compile_rule(rule: &RequestRule) -> Result<CompiledRequestRule> {
        let compiled_capture = Self::compile_capture_condition(&rule.capture.condition)?;

        Ok(CompiledRequestRule {
            id: rule.id,
            name: rule.name.clone(),
            enabled: rule.enabled,
            priority: rule.priority,
            capture: compiled_capture,
            original_rule: rule.clone(),
        })
    }

    /// Compile a capture condition
    fn compile_capture_condition(condition: &CaptureCondition) -> Result<CompiledCaptureRule> {
        match condition {
            CaptureCondition::Simple(simple) => {
                let compiled_condition = Self::compile_simple_condition(simple)?;
                Ok(CompiledCaptureRule::Simple(compiled_condition))
            }
            CaptureCondition::Complex(complex) => {
                let mut compiled_conditions = Vec::new();
                for sub_condition in &complex.conditions {
                    compiled_conditions.push(Self::compile_capture_condition(sub_condition)?);
                }

                Ok(CompiledCaptureRule::Complex {
                    operator: complex.operator.clone(),
                    conditions: compiled_conditions,
                })
            }
        }
    }

    /// Compile a simple capture condition
    fn compile_simple_condition(
        condition: &SimpleCaptureCondition,
    ) -> Result<CompiledCaptureCondition> {
        // If url_pattern is provided, validate and compile it
        let pattern = if let Some(ref url_pattern) = condition.url_pattern {
            match url_pattern.capture_type {
                CaptureType::Glob => {
                    let pattern = Pattern::new(&url_pattern.pattern)?;
                    CompiledPattern::Glob(pattern)
                }
                CaptureType::Regex => {
                    let regex = Regex::new(&url_pattern.pattern)?;
                    CompiledPattern::Regex(regex)
                }
                CaptureType::Exact => CompiledPattern::Exact(url_pattern.pattern.clone()),
                CaptureType::Contains => CompiledPattern::Contains(url_pattern.pattern.clone()),
            }
        } else {
            // If no url_pattern is provided, use a wildcard pattern that matches everything
            CompiledPattern::Glob(Pattern::new("*")?)
        };

        Ok(CompiledCaptureCondition {
            pattern,
            method: condition.method.clone(),
            host: condition.host.clone(),
            headers: condition.headers.clone(),
        })
    }

    /// Check if compiled capture rule matches request
    fn compiled_capture_matches<T: HttpBody>(
        capture: &CompiledCaptureRule,
        request: &Request<T>,
    ) -> Result<bool> {
        match capture {
            CompiledCaptureRule::Simple(simple) => Self::compiled_simple_matches(simple, request),
            CompiledCaptureRule::Complex {
                operator,
                conditions,
            } => match operator {
                LogicalOperator::And => {
                    for condition in conditions {
                        if !Self::compiled_capture_matches(condition, request)? {
                            return Ok(false);
                        }
                    }
                    Ok(true)
                }
                LogicalOperator::Or => {
                    for condition in conditions {
                        if Self::compiled_capture_matches(condition, request)? {
                            return Ok(true);
                        }
                    }
                    Ok(false)
                }
                LogicalOperator::Not => {
                    if conditions.len() != 1 {
                        return Err(RequestProcessingError::RuleValidation {
                            reason: "NOT operator must have exactly one condition".to_string(),
                        }
                        .into());
                    }
                    let result = Self::compiled_capture_matches(&conditions[0], request)?;
                    Ok(!result)
                }
            },
        }
    }

    /// Check if compiled simple condition matches request
    fn compiled_simple_matches<T: HttpBody>(
        condition: &CompiledCaptureCondition,
        request: &Request<T>,
    ) -> Result<bool> {
        // Extract data from axum Request
        let url = request.uri().to_string();
        let method = request.method().to_string();
        let host = request
            .headers()
            .get("host")
            .and_then(|h| h.to_str().ok())
            .unwrap_or_default();
        let headers = HeaderUtils::extract_headers(request.headers());

        // Check method
        if let Some(ref method_condition) = condition.method {
            if !method_condition.is_empty() && !method_condition.eq_ignore_ascii_case(&method) {
                return Ok(false);
            }
        }

        // Check host
        if let Some(ref host_condition) = condition.host {
            if !host_condition.is_empty() && !host_condition.eq_ignore_ascii_case(host) {
                return Ok(false);
            }
        }

        // Check headers
        if let Some(ref condition_headers) = condition.headers {
            for header_map in condition_headers {
                for (key, expected_value) in header_map {
                    if let Some(actual_value) = headers.get(key) {
                        if !expected_value.is_empty() && !actual_value.eq_ignore_ascii_case(expected_value) {
                            return Ok(false);
                        }
                    } else if !expected_value.is_empty() {
                        // Header is required but not present
                        return Ok(false);
                    }
                }
            }
        }

        // Check pattern against URL
        Ok(condition.pattern.matches(&url))
    }
}

impl Default for RuleMatcher {
    fn default() -> Self {
        Self::new()
    }
}