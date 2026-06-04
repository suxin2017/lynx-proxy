mod common;

use common::editor_story_fixtures::{
    DSL_STORY_EXAMPLES, DSL_STORY_EXTRA_VALID, DSL_STORY_INVALID,
};
use lynx_dsl::{format_dsl, has_parse_errors, parse_program};

#[test]
fn editor_story_fixtures_parse() {
    for example in DSL_STORY_EXAMPLES
        .iter()
        .chain(DSL_STORY_EXTRA_VALID.iter())
    {
        assert!(
            !has_parse_errors(example.value),
            "expected valid DSL for \"{}\"",
            example.label
        );
        let program = parse_program(example.value).unwrap_or_else(|error| {
            panic!("parse_program failed for \"{}\": {error:?}", example.label)
        });
        assert!(
            program.expr.is_some() || example.value.trim().starts_with('#'),
            "expected expression or comment-only document for \"{}\"",
            example.label
        );
    }
}

#[test]
fn editor_story_invalid_syntax_rejected() {
    for example in DSL_STORY_INVALID {
        assert!(
            has_parse_errors(example.value),
            "expected invalid DSL for \"{}\"",
            example.label
        );
    }
}

#[test]
fn editor_format_story_round_trips() {
    let example = DSL_STORY_EXTRA_VALID
        .iter()
        .find(|item| item.label == "Format story (messy input)")
        .expect("format story fixture");
    let formatted = format_dsl(example.value)
        .unwrap_or_else(|error| panic!("format failed for \"{}\": {error:?}", example.label))
        .expect("expected formatted output");
    assert!(!has_parse_errors(&formatted));
    assert!(formatted.contains("AND"));
    assert!(formatted.contains("OR"));
}
