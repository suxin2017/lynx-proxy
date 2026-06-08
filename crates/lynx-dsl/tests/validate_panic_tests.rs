use lynx_dsl::validate;

fn assert_validate_never_panics(input: &str) {
    let result = std::panic::catch_unwind(|| validate(input));
    assert!(
        result.is_ok(),
        "validate panicked on input: {:?}",
        input.chars().take(120).collect::<String>()
    );
}

#[test]
fn validate_never_panics_on_common_partial_inputs() {
    let cases = [
        "",
        " ",
        "\n",
        "(",
        ")",
        "NOT",
        "NOT ",
        "AND",
        "OR",
        "example.com",
        "example.com AND",
        "example.com AND ",
        "example.com AND (",
        "example.com AND ( ",
        "(example.com",
        "(example.com OR /api",
        "https://",
        "https://example.com",
        "?foo=bar",
        "-X",
        "-X POST",
        "example.com -X",
        "# comment",
        "example.com # trailing",
        "例.com",
        "example.com AND 例",
        "host:8080",
        "example.com:99999",
        "*/rest/*",
        "NOT */rest/* AND -X POST",
        "(\n  example.com\n  OR /api/\n)",
    ];

    for input in cases {
        assert_validate_never_panics(input);
    }
}

#[test]
fn validate_never_panics_on_incremental_prefixes() {
    let samples = [
        "example.com AND /api OR NOT https://example.com/health",
        "api.example.com -h Authorization=Bearer x --header Content-Type=application/json",
        "(\n  foo.example.com\n  OR /api/v1/*\n)\nAND NOT https://bar.example.com/health",
    ];

    for sample in samples {
        for end in 0..=sample.len() {
            assert_validate_never_panics(&sample[..end]);
        }
    }
}
