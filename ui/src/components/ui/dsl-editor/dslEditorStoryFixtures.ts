/**
 * Storybook showcase: DSL URL + boolean operator boundary cases.
 * Uses example.com / localhost / 127.0.0.1 only.
 */
export const dslBoundaryCaseExamples = [
  '# host',
  'example.com',
  'localhost',
  '127.0.0.1',

  '# host + port / path',
  'example.com:5678',
  'example.com/',
  'example.com/api',
  'example.com/api/',
  'example.com:5678/api/v1',

  '# path only',
  '/',
  '/a',
  '/a*',
  '/a/',
  '/api/v1/events/track',

  '# schemes',
  'http://example.com/',
  'https://example.com/',
  'ws://example.com/',
  'wss://example.com/',
  'HTTPS://example.com/api',

  '# full URL (multi-segment path)',
  'https://example.com/api/v1/events/track',

  '# boolean operators (AND / OR / NOT)',
  'example.com AND /api',
  'example.com OR /api',
  'NOT example.com',
  'example.com and /api',
  'example.com or /api',
  'not example.com',

  '# grouping & precedence',
  '(example.com OR /api/)',
  '(example.com OR /api/) AND NOT https://example.com/',
  'example.com AND ( /api OR /health ) AND ws://example.com:8080/status',

  '# combined expression',
  'example.com AND /api/v1/events/track OR https://example.com:443/health',

  '# invalid (AST should show ⚠)',
  'example.com AND (',
  '(example.com OR /api',
].join('\n')
