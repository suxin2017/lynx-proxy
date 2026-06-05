import { describe, expect, it } from 'vitest'
import { createEmptyDraft } from './empty-draft'
import {
  composeRequestUrl,
  normalizeDraftUrlParams,
  parseUrlParams,
  resolveRequestUrl,
  syncDraftParamsToUrl,
  syncDraftUrlToParams,
  urlBaseWithoutQuery,
} from './parse-url-params'

describe('resolveRequestUrl', () => {
  it('does not duplicate query params from URL bar and Params table', () => {
    const url = 'https://example.com/path?sig=abc&token=1'
    const queryParams = parseUrlParams(url)
    const resolved = resolveRequestUrl(url, queryParams)
    const parsed = new URL(resolved)
    expect(parsed.searchParams.getAll('sig')).toEqual(['abc'])
    expect(parsed.searchParams.getAll('token')).toEqual(['1'])
  })

  it('composeRequestUrl keeps address-bar query verbatim for signed URLs', () => {
    const url =
      'https://example.com/path?adExtInfo=%7B%22gaid%22%3A%221%22%7D&sig=abc'
    const params = parseUrlParams(url)
    expect(composeRequestUrl(url, params)).toBe(url)
  })
})

describe('URL ↔ Params sync', () => {
  it('syncDraftUrlToParams keeps query in the address bar', () => {
    const draft = syncDraftUrlToParams(createEmptyDraft(), 'https://example.com/x?a=1')
    expect(draft.url).toBe('https://example.com/x?a=1')
    expect(draft.queryParams).toEqual([{ key: 'a', value: '1', enabled: true }])
  })

  it('syncDraftParamsToUrl writes query into the address bar', () => {
    const draft = syncDraftParamsToUrl({
      ...createEmptyDraft(),
      url: 'https://example.com/x',
      queryParams: [{ key: 'sig', value: 'abc', enabled: true }],
    })
    expect(draft.url).toBe('https://example.com/x?sig=abc')
  })

  it('normalizeDraftUrlParams rebuilds address bar from Params when URL has no query', () => {
    const draft = normalizeDraftUrlParams({
      ...createEmptyDraft(),
      url: 'https://example.com/api',
      queryParams: [{ key: 'sig', value: 'x', enabled: true }],
    })
    expect(draft.url).toBe('https://example.com/api?sig=x')
  })

  it('normalizeDraftUrlParams does not re-encode an existing address-bar query', () => {
    const encoded =
      'https://example.com/api?adExtInfo=%7B%22gaid%22%3A%221%22%7D&sig=abc'
    const draft = normalizeDraftUrlParams({
      ...createEmptyDraft(),
      url: encoded,
      queryParams: [{ key: 'stale', value: 'row', enabled: true }],
    })
    expect(draft.url).toBe(encoded)
    expect(draft.queryParams[0]?.key).toBe('adExtInfo')
  })
})

describe('urlBaseWithoutQuery', () => {
  it('strips query and hash', () => {
    expect(urlBaseWithoutQuery('https://a.com/x?k=v#frag')).toBe('https://a.com/x')
  })
})
