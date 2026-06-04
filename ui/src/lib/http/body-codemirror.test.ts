import { describe, expect, it } from 'vitest'
import { bodyKindToCodeMirrorLanguage, bodyKindUsesSoftWrap } from './body-codemirror'

describe('bodyKindToCodeMirrorLanguage', () => {
  it('maps structured preview kinds to CodeMirror languages', () => {
    expect(bodyKindToCodeMirrorLanguage('json')).toBe('json')
    expect(bodyKindToCodeMirrorLanguage('html')).toBe('html')
    expect(bodyKindToCodeMirrorLanguage('xml')).toBe('xml')
    expect(bodyKindToCodeMirrorLanguage('css')).toBe('css')
    expect(bodyKindToCodeMirrorLanguage('javascript')).toBe('javascript')
    expect(bodyKindToCodeMirrorLanguage('hex')).toBe('hex')
    expect(bodyKindToCodeMirrorLanguage('base64')).toBe('base64')
    expect(bodyKindToCodeMirrorLanguage('sse')).toBe('sse')
  })

  it('infers json from text content-type', () => {
    expect(bodyKindToCodeMirrorLanguage('text', 'application/json; charset=utf-8')).toBe('json')
  })

  it('infers sse from event-stream content-type on text kind', () => {
    expect(bodyKindToCodeMirrorLanguage('text', 'text/event-stream')).toBe('sse')
  })
})

describe('bodyKindUsesSoftWrap', () => {
  it('wraps text-like previews but not hex or sse wire lines', () => {
    expect(bodyKindUsesSoftWrap('text')).toBe(true)
    expect(bodyKindUsesSoftWrap('json')).toBe(true)
    expect(bodyKindUsesSoftWrap('base64')).toBe(true)
    expect(bodyKindUsesSoftWrap('hex')).toBe(false)
    expect(bodyKindUsesSoftWrap('sse')).toBe(false)
  })
})
