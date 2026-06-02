import { describe, expect, it } from 'vitest'
import {
  listAvailablePreviewKinds,
  resolveBodyPreviewKind,
} from './body-preview-kind'

describe('resolveBodyPreviewKind', () => {
  it('maps application/json to json', () => {
    expect(resolveBodyPreviewKind('application/json; charset=utf-8')).toBe('json')
  })

  it('maps multipart/form-data to form-multipart', () => {
    expect(resolveBodyPreviewKind('multipart/form-data; boundary=abc')).toBe('form-multipart')
  })

  it('maps image content types to media-image', () => {
    expect(resolveBodyPreviewKind('image/png')).toBe('media-image')
  })

  it('uses text for websocket context', () => {
    expect(resolveBodyPreviewKind(undefined, { isWebSocket: true })).toBe('text')
  })
})

describe('listAvailablePreviewKinds', () => {
  it('includes json and hex/base64 for json payloads', () => {
    const kinds = listAvailablePreviewKinds(12, 'application/json')
    expect(kinds).toContain('json')
    expect(kinds).toContain('hex')
    expect(kinds).toContain('base64')
  })

  it('includes form-multipart tab for multipart bodies', () => {
    const kinds = listAvailablePreviewKinds(64, 'multipart/form-data; boundary=x')
    expect(kinds).toContain('form-multipart')
  })

  it('includes html tab for html content type', () => {
    const kinds = listAvailablePreviewKinds(32, 'text/html; charset=utf-8')
    expect(kinds).toContain('html')
    expect(kinds).not.toContain('text')
  })
})
