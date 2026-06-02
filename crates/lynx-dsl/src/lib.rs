pub mod ast;
pub mod compile;
pub mod error;
pub mod eval;
pub mod expr_parser;
pub mod facts;
pub mod format;
pub mod highlight;
pub mod ir;
pub mod parser;
pub mod span;
pub mod validate;

#[cfg(all(feature = "wasm", target_arch = "wasm32"))]
pub mod wasm;

pub use ast::{Program, Span};
pub use compile::{compile_match_expr, CompileError};
pub use error::{FormatError, ParseError};
pub use eval::{eval_predicate, eval_program};
pub use facts::{RequestFacts, RequestFactsBuilder};
pub use format::{
    can_format_dsl, format_dsl, is_dsl_formatted, validate_dsl_document, DslFormatValidationResult,
};
pub use ir::{EvalPlan, MatchProgram, Predicate};
pub use parser::{
    has_parse_errors, mask_line_comments, normalize_logic_keywords, parse_program,
    parse_program_partial, prepare_source, ParseProgramOutcome,
};
pub use highlight::HighlightSpan;
pub use validate::{collect_syntax_diagnostics, validate, Diagnostic, ValidationResult};
