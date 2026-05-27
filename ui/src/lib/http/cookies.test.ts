import { describe, expect, it } from 'vitest'

import {
  deriveRequestCookies,
  deriveResponseCookies,
  parseCookieHeader,
  parseSetCookieHeader,
} from './cookies'

describe('parseCookieHeader', () => {
  it('parses semicolon-separated cookie pairs', () => {
    expect(parseCookieHeader('session_id=sess_1; locale=zh-CN')).toEqual([
      { key: 'session_id', value: 'sess_1' },
      { key: 'locale', value: 'zh-CN' },
    ])
  })

  it('returns empty array for blank header', () => {
    expect(parseCookieHeader('   ')).toEqual([])
  })
})

describe('parseSetCookieHeader', () => {
  it('keeps only name=value before attributes', () => {
    expect(parseSetCookieHeader('refresh_hint=true; Path=/; HttpOnly')).toEqual([
      { key: 'refresh_hint', value: 'true' },
    ])
  })

  it('parses multiple lines when merged', () => {
    expect(parseSetCookieHeader('a=1; Path=/\nb=2; Secure')).toEqual([
      { key: 'a', value: '1' },
      { key: 'b', value: '2' },
    ])
  })
})

describe('derive cookies from headers', () => {
  it('is case-insensitive for header names', () => {
    expect(deriveRequestCookies({ Cookie: 'sid=1' })).toEqual([{ key: 'sid', value: '1' }])
    expect(deriveResponseCookies({ 'Set-Cookie': 'rid=2; Path=/' })).toEqual([
      { key: 'rid', value: '2' },
    ])
  })
})
