//! Editor / Storybook DSL examples.
//! Keep in sync with `ui/src/components/ui/dsl-editor/dslEditorStoryFixtures.ts`
//! and extra Storybook-only samples in `DslEditor.stories.ts`.

pub struct EditorStoryExample {
    pub label: &'static str,
    pub value: &'static str,
}

/// Valid expressions from `dslStoryExamples` in the UI fixtures.
pub const DSL_STORY_EXAMPLES: &[EditorStoryExample] = &[
    EditorStoryExample {
        label: "Host only",
        value: "example.com",
    },
    EditorStoryExample {
        label: "Localhost",
        value: "localhost",
    },
    EditorStoryExample {
        label: "IPv4",
        value: "127.0.0.1",
    },
    EditorStoryExample {
        label: "Host + port",
        value: "example.com:5678",
    },
    EditorStoryExample {
        label: "Host + path",
        value: "example.com/api/",
    },
    EditorStoryExample {
        label: "Host + port + path",
        value: "example.com:5678/api/v1",
    },
    EditorStoryExample {
        label: "Path only (/)",
        value: "/",
    },
    EditorStoryExample {
        label: "Path only (/a/)",
        value: "/a/",
    },
    EditorStoryExample {
        label: "Path multi-segment",
        value: "/api/v1/events/track",
    },
    EditorStoryExample {
        label: "Glob */a",
        value: "*/a",
    },
    EditorStoryExample {
        label: "Glob **/a",
        value: "**/a",
    },
    EditorStoryExample {
        label: "Glob /api/*/v1",
        value: "/api/*/v1",
    },
    EditorStoryExample {
        label: "Glob /api/**/track",
        value: "/api/**/track",
    },
    EditorStoryExample {
        label: "CLI short + long flags",
        value: "example.com -h x-token=b --header foo=bar --header-include xxx",
    },
    EditorStoryExample {
        label: "CLI glued value",
        value: "example.com --header=x-token=b",
    },
    EditorStoryExample {
        label: "CLI -X POST (curl)",
        value: "example.com -X POST",
    },
    EditorStoryExample {
        label: "CLI - X POST (spaced)",
        value: "example.com - X POST",
    },
    EditorStoryExample {
        label: "CLI-only primary",
        value: "NOT */rest/* AND -X POST",
    },
    EditorStoryExample {
        label: "example.xxx + trailing comment",
        value: "api.example.xxx OR # failover alias unused",
    },
    EditorStoryExample {
        label: "example.xxx + CLI + comment",
        value: "beta.example.xxx -X POST --mode demo OR # smoke test target",
    },
    EditorStoryExample {
        label: "example.xxx + AND comment tail",
        value: "cdn.example.xxx AND # cache layer only",
    },
    EditorStoryExample {
        label: "HTTP scheme",
        value: "http://example.com/",
    },
    EditorStoryExample {
        label: "HTTPS + path",
        value: "https://example.com/api/v1/events/track",
    },
    EditorStoryExample {
        label: "WebSocket",
        value: "ws://example.com:8080/status",
    },
    EditorStoryExample {
        label: "AND",
        value: "example.com AND /api",
    },
    EditorStoryExample {
        label: "OR",
        value: "example.com OR /api",
    },
    EditorStoryExample {
        label: "NOT",
        value: "NOT example.com",
    },
    EditorStoryExample {
        label: "Lowercase operators",
        value: "example.com and /api or /health",
    },
    EditorStoryExample {
        label: "Grouping + precedence",
        value: "(example.com OR /api/) AND NOT https://example.com/health",
    },
    EditorStoryExample {
        label: "Combined",
        value: "example.com AND /api/v1/events/track OR https://example.com:443/health",
    },
    EditorStoryExample {
        label: "Comment + expression",
        value: "# match api traffic\nexample.com AND /api",
    },
    EditorStoryExample {
        label: "Trailing comment",
        value: "example.com AND /api # keep for docs",
    },
    EditorStoryExample {
        label: "Comment only",
        value: "# notes only",
    },
];

/// Additional valid samples used only in Storybook stories (not in the picker list).
pub const DSL_STORY_EXTRA_VALID: &[EditorStoryExample] = &[
    EditorStoryExample {
        label: "Readonly story",
        value: "(example.com OR /api/) AND NOT https://example.com/health",
    },
    EditorStoryExample {
        label: "WithoutLineNumbers story",
        value: "example.com OR /api/ AND https://example.com/health",
    },
    EditorStoryExample {
        label: "Format story (messy input)",
        value: "# filter: api + health exclusion\n( example.com  or  /api/ )   and   not   https://example.com/health\nOR   /public/**",
    },
    EditorStoryExample {
        label: "Grouped multiline OR (format regression)",
        value: "(\n  example.com\n  OR /api/\n)\nAND NOT https://example.com/health",
    },
];

/// Storybook invalid-syntax sample.
pub const DSL_STORY_INVALID: &[EditorStoryExample] = &[EditorStoryExample {
    label: "InvalidSyntax story",
    value: "example.com AND (",
}];
