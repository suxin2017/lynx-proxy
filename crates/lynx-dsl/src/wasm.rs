use wasm_bindgen::prelude::*;

use crate::{
    collect_syntax_diagnostics, format_dsl, parse_program, validate, validate_dsl_document, Diagnostic,
    ValidationResult,
};

#[wasm_bindgen]
pub fn validate_dsl(source: &str) -> JsValue {
    let result = validate(source);
    serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
}

#[wasm_bindgen]
pub fn format_dsl_wasm(source: &str) -> Option<String> {
    format_dsl(source).ok().flatten()
}

#[wasm_bindgen]
pub fn validate_dsl_document_wasm(source: &str) -> JsValue {
    let result = validate_dsl_document(source);
    serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
}

#[wasm_bindgen]
pub fn collect_dsl_syntax_diagnostics(source: &str) -> JsValue {
    let diagnostics = collect_syntax_diagnostics(source);
    serde_wasm_bindgen::to_value(&diagnostics).unwrap_or(JsValue::NULL)
}

#[wasm_bindgen]
pub fn has_dsl_parse_errors(source: &str) -> bool {
    crate::has_parse_errors(source)
}

#[wasm_bindgen]
pub fn parse_dsl_program_wasm(source: &str) -> JsValue {
    match parse_program(source) {
        Ok(program) => serde_wasm_bindgen::to_value(&program).unwrap_or(JsValue::NULL),
        Err(_) => JsValue::NULL,
    }
}

#[wasm_bindgen(start)]
pub fn init() {}

#[allow(dead_code)]
fn export_types_for_ts() {
    let _: ValidationResult = ValidationResult {
        is_valid: false,
        diagnostics: vec![Diagnostic {
            from: 0,
            to: 1,
            severity: "error".to_string(),
            message: String::new(),
        }],
        highlights: Vec::new(),
    };
}
