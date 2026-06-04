import { describe, expect, it } from 'vitest'
import {
  appendBodyBytes,
  base64ToBytes,
  bytesToBase64,
  contentTypeFromHeaders,
  extractBodyChunk,
} from './body-transport'
import { MAX_BODY_STORE_BYTES } from './body-display-limits'

describe('base64ToBytes / bytesToBase64', () => {
  it('round-trips utf-8 payloads', () => {
    const original = new TextEncoder().encode('{"ok":true}')
    const encoded = bytesToBase64(original)
    expect(base64ToBytes(encoded)).toEqual(original)
  })
})

describe('extractBodyChunk', () => {
  it('reads data field and decodes base64', () => {
    const encoded = btoa('chunk')
    expect(extractBodyChunk({ data: encoded })).toEqual(
      new TextEncoder().encode('chunk'),
    )
  })

  it('returns undefined for null terminator frames', () => {
    expect(extractBodyChunk({ traceId: '1', data: null })).toBeUndefined()
  })
})

describe('appendBodyBytes', () => {
  it('appends decoded chunks', () => {
    const first = new TextEncoder().encode('a')
    const second = new TextEncoder().encode('b')
    const result = appendBodyBytes(first, second)
    expect(new TextDecoder().decode(result.bytes)).toBe('ab')
    expect(result.truncated).toBe(false)
  })

  it('keeps current body when chunk is empty', () => {
    const current = new TextEncoder().encode('keep')
    const result = appendBodyBytes(current, new Uint8Array(0))
    expect(result.bytes).toEqual(current)
    expect(result.truncated).toBe(false)
  })

  it('truncates when combined length exceeds store limit', () => {
    const max = 8
    const first = new Uint8Array(max)
    first.fill(65)
    const chunk = new TextEncoder().encode('overflow')
    const result = appendBodyBytes(first, chunk, max)
    expect(result.bytes.length).toBe(max)
    expect(result.truncated).toBe(true)
  })

  it('does not grow past store cap when already full', () => {
    const full = new Uint8Array(MAX_BODY_STORE_BYTES)
    const chunk = new Uint8Array([1])
    const result = appendBodyBytes(full, chunk)
    expect(result.bytes.length).toBe(MAX_BODY_STORE_BYTES)
    expect(result.truncated).toBe(true)
  })
})

describe('contentTypeFromHeaders', () => {
  it('finds content-type case-insensitively', () => {
    expect(contentTypeFromHeaders({ 'Content-Type': 'application/json' }))
      .toBe('application/json')
  })
})
