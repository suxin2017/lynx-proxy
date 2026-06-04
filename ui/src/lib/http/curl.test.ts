import { describe, expect, it } from 'vitest'
import type { NetworkDetailRecord } from '@/components/ui/network-request-detail/types'
import { exportNetworkRecordToCurl } from './curl'

function jsonBodyBytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(value, null, 2))
}

describe('exportNetworkRecordToCurl', () => {
  it('exports method, url, headers and json body', () => {
    const record: NetworkDetailRecord = {
      id: 'req-1',
      method: 'POST',
      url: 'https://example.com/api/v1/events?x=1',
      status: 'success',
      statusCode: 200,
      requestType: 'fetch',
      query: [],
      requestHeaders: [
        { key: 'content-type', value: 'application/json' },
        { key: 'x-token', value: 'abc' },
      ],
      responseHeaders: [],
      requestContentType: 'application/json',
      responseContentType: undefined,
      requestBodyBytes: jsonBodyBytes({ ok: true }),
      responseBodyBytes: undefined,
      size: {},
    }

    const curl = exportNetworkRecordToCurl(record)
    expect(curl).toContain("curl 'https://example.com/api/v1/events?x=1'")
    expect(curl).toContain('-X POST')
    expect(curl).toContain("-H 'content-type: application/json'")
    expect(curl).toContain("-H 'x-token: abc'")
    expect(curl).toContain("-d '")
    expect(curl).toContain('"ok": true')
  })

  it('filters pseudo headers and skips connection/content-length/accept-encoding', () => {
    const record: NetworkDetailRecord = {
      id: 'req-2',
      method: 'GET',
      url: 'https://example.com/',
      status: 'success',
      statusCode: 200,
      requestType: 'fetch',
      query: [],
      requestHeaders: [
        { key: ':method', value: 'GET' },
        { key: 'connection', value: 'keep-alive' },
        { key: 'content-length', value: '10' },
        { key: 'accept-encoding', value: 'gzip' },
        { key: 'x-keep', value: '1' },
      ],
      responseHeaders: [],
      requestContentType: undefined,
      responseContentType: undefined,
      requestBodyBytes: undefined,
      responseBodyBytes: undefined,
      size: {},
    }

    const curl = exportNetworkRecordToCurl(record)
    expect(curl).not.toContain(":method: GET")
    expect(curl).not.toContain("connection: keep-alive")
    expect(curl).not.toContain("content-length: 10")
    expect(curl).not.toContain("accept-encoding: gzip")
    expect(curl).toContain("x-keep: 1")
  })

  it('escapes single quotes in url, headers and body', () => {
    const record: NetworkDetailRecord = {
      id: 'req-3',
      method: 'POST',
      url: "https://example.com/q?x=it'works",
      status: 'success',
      statusCode: 200,
      requestType: 'fetch',
      query: [],
      requestHeaders: [
        { key: 'x-note', value: "a'b" },
        { key: 'content-type', value: 'application/json' },
      ],
      responseHeaders: [],
      requestContentType: 'application/json',
      responseContentType: undefined,
      requestBodyBytes: jsonBodyBytes({ note: "a'b" }),
      responseBodyBytes: undefined,
      size: {},
    }

    const curl = exportNetworkRecordToCurl(record)
    // sh-escaping pattern used in existing exportDraftToCurl:  ' => '\'' (written as '\'\'' in string)
    expect(curl).toContain("'\\''")
  })
})

