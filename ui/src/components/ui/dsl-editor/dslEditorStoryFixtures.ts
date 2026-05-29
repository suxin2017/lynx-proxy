/**
 * Storybook: one valid DSL expression per entry (Program allows a single Expr?).
 * Uses example.com / localhost / 127.0.0.1 only.
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

  { label: 'HTTP scheme', value: 'http://example.com/' },
  { label: 'HTTPS + path', value: 'https://example.com/api/v1/events/track' },
  { label: 'WebSocket', value: 'ws://example.com:8080/status' },

  { label: 'AND', value: 'example.com AND /api' },
  { label: 'OR', value: 'example.com OR /api' },
  { label: 'NOT', value: 'NOT example.com' },
  { label: 'Lowercase operators', value: 'example.com and /api or /health' },

  { label: 'Grouping + precedence', value: '(example.com OR /api/) AND NOT https://example.com/health' },
  { label: 'Combined', value: 'example.com AND /api/v1/events/track OR https://example.com:443/health' },

  { label: 'Comment + expression', value: '# match api traffic\nexample.com AND /api' },
  { label: 'Trailing comment', value: 'example.com AND /api # production' },
  { label: 'Comment only', value: '# notes only' },
]

export const defaultDslStoryExample = dslStoryExamples[0]!
