/**
 * Storybook: one valid DSL expression per entry (Program allows a single Expr?).
 * Uses example.com, example.xxx, localhost, and 127.0.0.1 only.
 *
 * Keep in sync with `crates/lynx-dsl/tests/common/editor_story_fixtures.rs`.
 */
export type DslStoryExample = {
  label: string
  value: string
}

export const dslStoryExamples: DslStoryExample[] = [
  { label: 'Host only', value: 'example.com' },
  { label: 'Localhost', value: 'localhost' },
  { label: 'IPv4', value: '127.0.0.1' },

  { label: 'Host + port', value: 'example.com:5678' },
  { label: 'Host + path', value: 'example.com/api/' },
  { label: 'Host + port + path', value: 'example.com:5678/api/v1' },

  { label: 'Path only (/)', value: '/' },
  { label: 'Path only (/a/)', value: '/a/' },
  { label: 'Path multi-segment', value: '/api/v1/events/track' },

  { label: 'Glob */a', value: '*/a' },
  { label: 'Glob **/a', value: '**/a' },
  { label: 'Glob /api/*/v1', value: '/api/*/v1' },
  { label: 'Glob /api/**/track', value: '/api/**/track' },

  { label: 'CLI short + long flags', value: 'example.com -h x-token=b --header foo=bar --header-include xxx' },
  { label: 'CLI glued value', value: 'example.com --header=x-token=b' },
  { label: 'CLI -X POST (curl)', value: 'example.com -X POST' },
  { label: 'CLI - X POST (spaced)', value: 'example.com - X POST' },
  { label: 'CLI-only primary', value: 'NOT */rest/* AND -X POST' },

  { label: 'example.xxx + trailing comment', value: 'api.example.xxx OR # failover alias unused' },
  { label: 'example.xxx + CLI + comment', value: 'beta.example.xxx -X POST --mode demo OR # smoke test target' },
  { label: 'example.xxx + AND comment tail', value: 'cdn.example.xxx AND # cache layer only' },

  { label: 'HTTP scheme', value: 'http://example.com/' },
  { label: 'HTTPS + path', value: 'https://example.com/api/v1/events/track' },
  { label: 'WebSocket', value: 'ws://example.com:8080/status' },

  { label: 'Host + path + query', value: 'example.com/v1/graphql?operationName=GetFeed&platform=android' },
  { label: 'Path + query', value: '/v2/feed/timeline?page_size=20&region=SG' },
  { label: 'Query only', value: '?user_id=123456&fields=id,name,avatar' },
  { label: 'HTTPS + path + query', value: 'https://example.com/v1/content/recommend?feed_type=for_you&limit=30' },

  { label: 'AND', value: 'example.com AND /api' },
  { label: 'OR', value: 'example.com OR /api' },
  { label: 'NOT', value: 'NOT example.com' },
  { label: 'Lowercase operators', value: 'example.com and /api or /health' },

  { label: 'Grouping + precedence', value: '(example.com OR /api/) AND NOT https://example.com/health' },
  { label: 'Combined', value: 'example.com AND /api/v1/events/track OR https://example.com:443/health' },

  { label: 'Comment + expression', value: '# match api traffic\nexample.com AND /api' },
  { label: 'Trailing comment', value: 'example.com AND /api # keep for docs' },
  { label: 'Comment only', value: '# notes only' },
]

export const defaultDslStoryExample = dslStoryExamples[0]!
