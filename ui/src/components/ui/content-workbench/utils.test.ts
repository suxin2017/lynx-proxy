import { describe, expect, it } from 'vitest'

import {
  resolveWorkbenchLanguage,
  normalizeWorkbenchContent,
  resolveWorkbenchSurface,
  workbenchTypeUsesSoftWrap,
} from './utils'

describe('resolveWorkbenchSurface', () => {
  it('routes plain text content to preview surface', () => {
    expect(resolveWorkbenchSurface({ type: 'text', content: 'hello' })).toBe('preview')
  })

  it('routes json content to readonly code surface', () => {
    expect(resolveWorkbenchSurface({ type: 'json', content: '{"ok":true}' })).toBe('readonly-code')
  })

  it('routes xml source content to readonly code surface', () => {
    expect(resolveWorkbenchSurface({ type: 'xml-source', content: '<note>ok</note>' })).toBe('readonly-code')
  })

  it('degrades oversized code content to preview surface', () => {
    expect(resolveWorkbenchSurface({ type: 'code', content: 'x'.repeat(12_000) })).toBe('preview')
  })

  it('keeps html-source on codemirror even when oversized', () => {
    expect(resolveWorkbenchSurface({ type: 'html-source', content: 'x'.repeat(12_000) })).toBe('readonly-code')
  })
})

describe('workbenchTypeUsesSoftWrap', () => {
  it('enables soft wrap for html-source', () => {
    expect(workbenchTypeUsesSoftWrap('html-source')).toBe(true)
  })
})

describe('normalizeWorkbenchContent', () => {
  it('formats object json input', () => {
    expect(normalizeWorkbenchContent({ type: 'json', content: { ok: true } }).displayValue)
      .toContain('\n  "ok": true\n')
  })

  it('falls back to raw input when json parsing fails', () => {
    const normalized = normalizeWorkbenchContent({ type: 'json', content: '{bad json}' })

    expect(normalized.displayValue).toBe('{bad json}')
    expect(normalized.hasFormattingError).toBe(true)
  })
})

describe('resolveWorkbenchLanguage', () => {
  it('maps json type to json language', () => {
    expect(resolveWorkbenchLanguage({ type: 'json' })).toBe('json')
  })

  it('maps html source type to html language', () => {
    expect(resolveWorkbenchLanguage({ type: 'html-source' })).toBe('html')
  })

  it('maps xml source type to xml language', () => {
    expect(resolveWorkbenchLanguage({ type: 'xml-source' })).toBe('xml')
  })

  it('maps css source type to css language', () => {
    expect(resolveWorkbenchLanguage({ type: 'css-source' })).toBe('css')
  })

  it('maps javascript source type to javascript language', () => {
    expect(resolveWorkbenchLanguage({ type: 'javascript-source' })).toBe('javascript')
  })

  it('maps explicit ts language to typescript mode', () => {
    expect(resolveWorkbenchLanguage({ type: 'code', language: 'ts' })).toBe('typescript')
  })

  it('maps explicit xml aliases to xml mode', () => {
    expect(resolveWorkbenchLanguage({ type: 'code', language: 'svg' })).toBe('xml')
  })

  it('maps explicit css language to css mode', () => {
    expect(resolveWorkbenchLanguage({ type: 'code', language: 'css' })).toBe('css')
  })

  it('falls back to plaintext for unsupported language', () => {
    expect(resolveWorkbenchLanguage({ type: 'code', language: 'rust' })).toBe('plaintext')
  })
})