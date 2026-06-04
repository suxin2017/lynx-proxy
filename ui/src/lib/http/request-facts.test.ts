import { describe, expect, it } from 'vitest'

import type { PartialRequestRecord } from '@/stores/modules/request-stream-logic'

import { requestFactsFromPartialRecord } from './request-facts'

describe('requestFactsFromPartialRecord', () => {
  it('builds facts from an absolute https URL with query and headers', () => {
    const record: PartialRequestRecord = {
      method: 'POST',
      url: 'https://example.com:443/api/v1/events/track?x=1&y=2',
      requestHeaders: [
        { key: 'Authorization', value: 'Bearer' },
        { key: 'X-Token', value: 'abc' },
      ],
    }

    expect(requestFactsFromPartialRecord(record)).toEqual({
      scheme: 'https',
      host: 'example.com',
      port: 443,
      path: '/api/v1/events/track',
      query: 'x=1&y=2',
      method: 'POST',
      headers: [
        ['authorization', 'Bearer'],
        ['x-token', 'abc'],
      ],
    })
  })

  it('uses Host header for origin-form URIs', () => {
    const record: PartialRequestRecord = {
      method: 'GET',
      url: '/api/v1/users?debug=1',
      requestHeaders: [
        { key: 'Host', value: 'example.com:443' },
        { key: 'Authorization', value: 'Bearer' },
      ],
    }

    expect(requestFactsFromPartialRecord(record)).toEqual({
      scheme: 'http',
      host: 'example.com',
      port: 443,
      path: '/api/v1/users',
      query: 'debug=1',
      method: 'GET',
      headers: [
        ['authorization', 'Bearer'],
        ['host', 'example.com:443'],
      ],
    })
  })

  it('lowercases and sorts header keys', () => {
    const record: PartialRequestRecord = {
      method: 'GET',
      url: 'https://example.com/api',
      requestHeaders: [
        { key: 'X-ToKeN', value: 'abc' },
        { key: 'accept', value: 'application/json' },
      ],
    }

    expect(requestFactsFromPartialRecord(record).headers).toEqual([
      ['accept', 'application/json'],
      ['x-token', 'abc'],
    ])
  })

  it('defaults method to GET and path to /', () => {
    expect(requestFactsFromPartialRecord({ url: 'https://example.com' })).toMatchObject({
      method: 'GET',
      path: '/',
      host: 'example.com',
    })
  })
})
