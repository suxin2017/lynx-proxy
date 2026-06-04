import { describe, expect, it } from 'vitest'

import {
  canFormatJsonDocument,
  isJsonDocumentFormatted,
  validateJsonDocument,
} from './utils'

describe('validateJsonDocument', () => {
  it('formats valid json input', () => {
    const result = validateJsonDocument('{"ok":true,"value":[1,2]}')

    expect(result.isValid).toBe(true)
    expect(result.formattedValue).toContain('\n  "ok": true,\n')
    expect(result.errorMessage).toBeNull()
  })

  it('reports empty content as invalid', () => {
    expect(validateJsonDocument('   ')).toEqual({
      isValid: false,
      formattedValue: null,
      errorMessage: 'JSON content is empty',
    })
  })

  it('returns parser errors for invalid json', () => {
    const result = validateJsonDocument('{bad json}')

    expect(result.isValid).toBe(false)
    expect(result.formattedValue).toBeNull()
    expect(result.errorMessage).toContain('JSON')
  })
})

describe('canFormatJsonDocument', () => {
  it('only allows valid json content', () => {
    expect(canFormatJsonDocument('{"ok":true}')).toBe(true)
    expect(canFormatJsonDocument('{bad json}')).toBe(false)
  })
})

describe('isJsonDocumentFormatted', () => {
  it('detects already formatted json', () => {
    expect(isJsonDocumentFormatted(`{
  "ok": true
}`)).toBe(true)
  })

  it('detects unformatted json', () => {
    expect(isJsonDocumentFormatted('{"ok":true}')).toBe(false)
  })
})