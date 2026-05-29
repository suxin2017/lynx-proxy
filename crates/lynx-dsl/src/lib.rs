pub mod ast;
pub mod error;
pub mod expr_parser;
pub mod format;
pub mod highlight;
pub mod parser;
pub mod span;
pub mod validate;

#[cfg(all(feature = "wasm", target_arch = "wasm32"))]
pub mod wasm;

pub use ast::{Program, Span};
pub use error::{FormatError, ParseError};
pub use format::{
    can_format_dsl, format_dsl, is_dsl_formatted, validate_dsl_document, DslFormatValidationResult,
};
pub use parser::{has_parse_errors, mask_line_comments, normalize_logic_keywords, parse_program, prepare_source};
pub use highlight::HighlightSpan;
pub use validate::{collect_syntax_diagnostics, validate, Diagnostic, ValidationResult};
