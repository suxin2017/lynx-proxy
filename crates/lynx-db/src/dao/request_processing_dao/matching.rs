use super::{
    request_info::RequestInfo,
    types::{CaptureRule, RequestRule},
};
use crate::entities::capture::CaptureType;
use anyhow::{Result, anyhow};
use glob::Pattern;

/// Rule matching functionality
pub struct RuleMatcher;

impl RuleMatcher {
    /// Find matching rules for a request
    pub fn find_matching_rules(
        rules: &[RequestRule],
        request: &RequestInfo,
    ) -> Result<Vec<RequestRule>> {
        let mut matching_rules = Vec::new();

        for rule in rules {
            if !rule.enabled {
                continue;
            }

            // Check if the capture rule matches
            if rule.capture.enabled && Self::capture_matches(&rule.capture, request)? {
                matching_rules.push(rule.clone());
            }
        }

        // Sort by priority (higher priority first)
        matching_rules.sort_by(|a, b| b.priority.cmp(&a.priority));
        Ok(matching_rules)
    }

    /// Check if a capture rule matches the request
    pub fn capture_matches(capture: &CaptureRule, request: &RequestInfo) -> Result<bool> {
        // Check method
        if let Some(ref method) = capture.method {
            if !method.is_empty() && !method.eq_ignore_ascii_case(&request.method) {
                return Ok(false);
            }
        }

        // Check host
        if let Some(ref host) = capture.host {
            if !host.is_empty() && !host.eq_ignore_ascii_case(&request.host) {
                return Ok(false);
            }
        }

        // Check pattern against URL
        match capture.capture_type {
            CaptureType::Glob => {
                let pattern = Pattern::new(&capture.pattern)
                    .map_err(|e| anyhow!("Invalid glob pattern: {}", e))?;
                Ok(pattern.matches(&request.url))
            } // CaptureType::Regex => {
              //     let regex = Regex::new(&capture.pattern)
              //         .map_err(|e| anyhow!("Invalid regex pattern: {}", e))?;
              //     Ok(regex.is_match(&request.url))
              // },
              // CaptureType::Exact => {
              //     Ok(capture.pattern == request.url)
              // },
              // CaptureType::Contains => {
              //     Ok(request.url.contains(&capture.pattern))
              // },
        }
    }
}
