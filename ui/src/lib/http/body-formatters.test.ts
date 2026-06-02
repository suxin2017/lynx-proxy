import { describe, expect, it } from 'vitest'
import { decodeBytes } from './body-charset'
import {
  formatBase64Body,
  formatHexDump,
  formatJsonBody,
  formatSseBody,
  formatTextBody,
  formatUrlEncodedForm,
} from './body-formatters'
import { assessBodyDisplay, MAX_BODY_RENDER_BYTES } from './body-display-limits'

describe('formatJsonBody', () => {
  it('pretty-prints valid json', () => {
    const bytes = new TextEncoder().encode('{"ok":true}')
    const result = formatJsonBody(bytes, 'application/json; charset=utf-8')
    expect(result.hasFormattingError).toBe(false)
    expect(result.display).toContain('"ok": true')
  })

  it('returns error object when json is invalid', () => {
    const bytes = new TextEncoder().encode('{bad')
    const result = formatJsonBody(bytes)
    expect(result.hasFormattingError).toBe(true)
    expect(result.display).toContain('JSON 解析失败')
  })
})

describe('formatBase64Body', () => {
  it('wraps long base64 into multiple lines', () => {
    const bytes = new Uint8Array(60)
    bytes.fill(0xab)
    const display = formatBase64Body(bytes, 20)
    expect(display.split('\n').length).toBeGreaterThan(1)
  })
})

describe('formatSseBody', () => {
  it('normalizes CRLF to LF so each field is on its own line', () => {
    const raw = 'event: msg\r\ndata: hi\r\n\r\n'
    const display = formatSseBody(new TextEncoder().encode(raw))
    expect(display).toBe('event: msg\ndata: hi\n\n')
    expect(display.split('\n')).toEqual(['event: msg', 'data: hi', '', ''])
  })
})

describe('formatHexDump', () => {
  it('formats 16-byte lines with offset', () => {
    const bytes = new Uint8Array([0, 1, 255])
    const dump = formatHexDump(bytes)
    expect(dump).toMatch(/^00000000\s+00 01 FF/m)
  })
})

describe('formatUrlEncodedForm', () => {
  it('parses key/value pairs', () => {
    const bytes = new TextEncoder().encode('a=1&b=two')
    const rows = formatUrlEncodedForm(bytes, 'application/x-www-form-urlencoded')
    expect(rows).toEqual([
      { key: 'a', value: '1' },
      { key: 'b', value: 'two' },
    ])
  })
})

describe('decodeBytes', () => {
  it('decodes invalid utf-8 without throwing', () => {
    const bytes = new Uint8Array([0xff, 0xfe, 0xfd])
    const result = decodeBytes(bytes, 'utf-8')
    expect(result.text.length).toBeGreaterThan(0)
    expect(result.lossy).toBe(true)
  })
})

describe('assessBodyDisplay gate for formatters', () => {
  it('skips render assessment for oversized payloads before formatting', () => {
    const bytes = new Uint8Array(MAX_BODY_RENDER_BYTES + 1)
    const assessment = assessBodyDisplay(bytes)
    expect(assessment.renderable).toBe(false)
    if (assessment.renderable) {
      formatTextBody(bytes)
    }
  })
})
