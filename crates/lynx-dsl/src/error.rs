use thiserror::Error;

use crate::ast::Span;

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
