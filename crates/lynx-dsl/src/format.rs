use serde::{Deserialize, Serialize};

use crate::ast::{AndExpr, NotExpr, OrExpr, Primary};
use crate::error::FormatError;
use crate::parser::{has_parse_errors, parse_program};

pub fn format_dsl(source: &str) -> Result<Option<String>, FormatError> {
    if source.trim().is_empty() {
        return Err(FormatError::Empty);
    }

    if has_parse_errors(source) {
        return Ok(None);
    }

    let prepared = crate::parser::prepare_source(source);
    let program = parse_program(source)?;
    let Some(expr) = program.expr else {
        return Ok(Some(source.to_string()));
    };

    let formatted_expr = format_or_expr(&expr.or, &prepared, "");
    let before = &source[..expr.span.start.min(source.len())];
    let after = &source[expr.span.end.min(source.len())..];
    Ok(Some(format!("{before}{formatted_expr}{after}")))
}

fn format_or_expr(or: &OrExpr, source: &str, base_indent: &str) -> String {
    if or.branches.is_empty() {
        return String::new();
    }
    if or.branches.len() == 1 {
        let content = format_and_expr(&or.branches[0], source, base_indent);
        return if base_indent.is_empty() {
            content
        } else {
            format!("{base_indent}{content}")
        };
    }

    let mut result = String::new();
    for (index, branch) in or.branches.iter().enumerate() {
        let formatted = format_and_expr(branch, source, base_indent);
        if index == 0 {
            if base_indent.is_empty() {
                result.push_str(&formatted);
            } else {
                result.push_str(&format!("{base_indent}{formatted}"));
            }
        } else {
            let or_prefix = if base_indent.is_empty() {
                "\nOR ".to_string()
            } else {
                format!("\n{base_indent}OR ")
            };
            result.push_str(&or_prefix);
            result.push_str(&formatted);
        }
    }
    result
}

fn format_and_expr(and: &AndExpr, source: &str, base_indent: &str) -> String {
    let parts: Vec<String> = and
        .terms
        .iter()
        .map(|term| format_not_expr(term, source, base_indent))
        .collect();
    let separator = if parts.iter().any(|part| part.contains('\n')) {
        "\nAND "
    } else {
        " AND "
    };
    parts.join(separator)
}

fn format_not_expr(not_expr: &NotExpr, source: &str, base_indent: &str) -> String {
    match not_expr {
        NotExpr::Not { inner, span } => {
            let inner_text = format_not_expr(inner, source, base_indent);
            if matches!(**inner, NotExpr::Not { .. }) {
                format!("NOT {inner_text}")
            } else if let NotExpr::Primary(primary) = &**inner {
                format!("NOT {}", format_primary(primary, source, base_indent))
            } else {
                format!("NOT {}", slice_span(source, *span))
            }
        }
        NotExpr::Primary(primary) => format_primary(primary, source, base_indent),
    }
}

fn format_primary(primary: &Primary, source: &str, base_indent: &str) -> String {
    match primary {
        Primary::Grouped(expr) => {
            let or = &expr.or;
            if or.branches.len() > 1 {
                let inner_indent = format!("{base_indent}  ");
                let inner = format_or_expr(or, source, &inner_indent);
                format!("(\n{inner}\n{base_indent})")
            } else {
                let inner = format_or_expr(or, source, "");
                format!("({inner})")
            }
        }
        Primary::CliOnly(cli) => slice_span(source, cli.span),
        Primary::Url { url, cli } => {
            let mut text = format_url(url);
            if let Some(cli_args) = cli {
                text.push(' ');
                text.push_str(slice_span(source, cli_args.span).trim_start());
            }
            text
        }
    }
}

fn slice_span(source: &str, span: crate::ast::Span) -> String {
    source[span.start..span.end].to_string()
}

fn format_url(url: &crate::ast::Url) -> String {
    let mut text = String::new();
    if let Some(scheme) = &url.scheme {
        text.push_str(&scheme.value);
    }
    if let Some(host) = &url.host {
        text.push_str(&host.value);
    }
    if let Some(port) = &url.port {
        text.push_str(&port.value);
    }
    if let Some(path) = &url.path {
        if url.host.is_some() && !path.value.starts_with('/') && text.ends_with(&url.host.as_ref().unwrap().value) {
            text.push(' ');
        }
        text.push_str(&path.value);
    }
    if let Some(query) = &url.query {
        text.push('?');
        text.push_str(&query.value);
    }
    text
}

pub fn can_format_dsl(content: &str) -> bool {
    format_dsl(content).ok().flatten().is_some()
}

pub fn is_dsl_formatted(content: &str) -> bool {
    match format_dsl(content) {
        Ok(Some(formatted)) => content == formatted,
        _ => false,
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DslFormatValidationResult {
    pub is_valid: bool,
    pub formatted_value: Option<String>,
}

pub fn validate_dsl_document(content: &str) -> DslFormatValidationResult {
    if content.trim().is_empty() {
        return DslFormatValidationResult {
            is_valid: false,
            formatted_value: None,
        };
    }

    if has_parse_errors(content) {
        return DslFormatValidationResult {
            is_valid: false,
            formatted_value: None,
        };
    }

    match format_dsl(content) {
        Ok(Some(formatted)) => DslFormatValidationResult {
            is_valid: true,
            formatted_value: Some(formatted),
        },
        Ok(None) => DslFormatValidationResult {
            is_valid: false,
            formatted_value: None,
        },
        Err(_) => DslFormatValidationResult {
            is_valid: false,
            formatted_value: None,
        },
    }
}
