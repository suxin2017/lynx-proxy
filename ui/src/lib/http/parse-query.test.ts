import { describe, expect, it } from 'vitest'
import { parseQueryFromUrl } from './parse-query'

describe('parseQueryFromUrl', () => {
  it('parses query string from absolute URL', () => {
    expect(parseQueryFromUrl('http://httpbin.org/get?n=10')).toEqual([
      { key: 'n', value: '10' },
    ])
  })

  it('parses multiple params', () => {
    expect(parseQueryFromUrl('https://example.com/a?x=1&y=2')).toEqual([
      { key: 'x', value: '1' },
      { key: 'y', value: '2' },
    ])
  })

  it('returns empty for URL without query', () => {
    expect(parseQueryFromUrl('http://httpbin.org/get')).toEqual([])
  })
})
