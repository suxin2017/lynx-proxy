use serde::Serialize;
use thiserror::Error;

use crate::ast::Span;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct ParseErrorInfo {
    pub message: String,
    pub start: usize,
    pub end: usize,
}

impl From<ParseError> for ParseErrorInfo {
    fn from(error: ParseError) -> Self {
        match error {
            ParseError::Syntax { span, message } => Self {
                message,
                start: span.start,
                end: span.end,
            },
            ParseError::TrailingInput { span } => Self {
                message: "unexpected trailing input".to_string(),
                start: span.start,
                end: span.end,
            },
        }
    }
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum ParseError {
    #[error("syntax error at {span:?}")]
    Syntax { span: Span, message: String },
    #[error("unexpected trailing input at {span:?}")]
    TrailingInput { span: Span },
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum FormatError {
    #[error("parse error: {0}")]
    Parse(#[from] ParseError),
    #[error("empty document")]
    Empty,
}
