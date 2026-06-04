use serde::Serialize;
use wasm_bindgen::prelude::*;

use crate::{
    collect_syntax_diagnostics, compile_match_expr, eval_program, format_dsl,
    parse_program_partial, validate, validate_dsl_document, Diagnostic, MatchProgram,
    RequestFacts, ValidationResult,
};

#[derive(Serialize)]
#[serde(untagged)]
enum CompileMatchResult {
    Ok { ok: bool, program: MatchProgram },
    Err { ok: bool, error: String },
}

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
    let outcome = parse_program_partial(source);
    serde_wasm_bindgen::to_value(&outcome).unwrap_or(JsValue::NULL)
}

#[wasm_bindgen]
pub fn compile_match_expr_wasm(source: &str) -> JsValue {
    let result = match compile_match_expr(source) {
        Ok(program) => CompileMatchResult::Ok {
            ok: true,
            program,
        },
        Err(error) => CompileMatchResult::Err {
            ok: false,
            error: error.to_string(),
        },
    };
    serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
}

#[wasm_bindgen]
pub fn eval_program_wasm(program: JsValue, facts: JsValue) -> bool {
    let program: MatchProgram = match serde_wasm_bindgen::from_value(program) {
        Ok(value) => value,
        Err(_) => return false,
    };
    let facts: RequestFacts = match serde_wasm_bindgen::from_value(facts) {
        Ok(value) => value,
        Err(_) => return false,
    };
    eval_program(&program, &facts)
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::RequestFacts;

    #[test]
    fn compile_match_expr_roundtrip_json() {
        let program = compile_match_expr("example.com AND -X POST").unwrap();
        let json = serde_json::to_string(&program).unwrap();
        let decoded: MatchProgram = serde_json::from_str(&json).unwrap();
        assert_eq!(program, decoded);

        let facts = RequestFacts::builder()
            .host("example.com")
            .method("POST")
            .build();
        assert!(eval_program(&decoded, &facts));
    }

    #[test]
    fn compile_match_result_ok_shape() {
        let result = CompileMatchResult::Ok {
            ok: true,
            program: compile_match_expr("example.com").unwrap(),
        };
        let value = serde_json::to_value(&result).unwrap();
        assert_eq!(value.get("ok"), Some(&serde_json::Value::Bool(true)));
        assert!(value.get("program").is_some());
    }

    #[test]
    fn compile_match_result_err_shape() {
        let result = CompileMatchResult::Err {
            ok: false,
            error: "empty match expression".to_string(),
        };
        let value = serde_json::to_value(&result).unwrap();
        assert_eq!(value.get("ok"), Some(&serde_json::Value::Bool(false)));
        assert_eq!(
            value.get("error").and_then(|v| v.as_str()),
            Some("empty match expression")
        );
    }
}
