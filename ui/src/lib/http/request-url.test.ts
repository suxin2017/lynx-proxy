import { describe, expect, it } from 'vitest'
import { displayRequestUrl, normalizeRequestUrl, resolveRequestUrl } from './request-url'

describe('normalizeRequestUrl', () => {
  it('keeps absolute http(s) URLs', () => {
    expect(normalizeRequestUrl('http://httpbin.org/get')).toBe('http://httpbin.org/get')
  })

  it('builds https URL for CONNECT authority', () => {
    expect(normalizeRequestUrl('httpbin.org:443', 'CONNECT')).toBe('https://httpbin.org:443')
  })

  it('joins relative path with Host header', () => {
    expect(
      normalizeRequestUrl('/get', 'GET', { Host: 'httpbin.org' }),
    ).toBe('http://httpbin.org/get')
  })
})

describe('resolveRequestUrl', () => {
  it('reads uri fallback', () => {
    expect(
      resolveRequestUrl({
        uri: 'httpbin.org:443',
        method: 'CONNECT',
      }),
    ).toBe('https://httpbin.org:443')
  })
})

describe('displayRequestUrl', () => {
  it('avoids trace:// placeholder', () => {
    expect(displayRequestUrl('trace://abc', 'abcdefghijklmnop')).toBe('请求 abcdefgh…')
    expect(displayRequestUrl('http://example.com', 'id')).toBe('http://example.com')
  })
})
