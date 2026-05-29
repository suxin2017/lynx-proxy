import { describe, expect, it } from 'vitest'

import { isKeywordCompletionBoundary } from './dslCompletion'

describe('isKeywordCompletionBoundary', () => {
  it('allows completion when surrounded by spaces', () => {
    const doc = 'example.com AND /a'
    const andFrom = doc.indexOf('AND')
    expect(isKeywordCompletionBoundary(doc, andFrom, andFrom + 3)).toBe(true)
  })

  it('rejects completion inside host or path tokens', () => {
    const host = 'example.com'
    expect(isKeywordCompletionBoundary(host, 0, host.length)).toBe(false)

    const path = '/a/'
    expect(isKeywordCompletionBoundary(path, 1, 2)).toBe(false)
  })

  it('rejects completion when only one side has whitespace', () => {
    const doc = 'AND /a'
    const andFrom = doc.indexOf('AND')
    expect(isKeywordCompletionBoundary(doc, andFrom, andFrom + 3)).toBe(false)

    const trailing = '/a AND'
    const andFrom2 = trailing.indexOf('AND')
    expect(isKeywordCompletionBoundary(trailing, andFrom2, andFrom2 + 3)).toBe(false)
  })

  it('rejects completion adjacent to parentheses', () => {
    const doc = '(AND /a)'
    const andFrom = doc.indexOf('AND')
    expect(isKeywordCompletionBoundary(doc, andFrom, andFrom + 3)).toBe(false)
  })
})
