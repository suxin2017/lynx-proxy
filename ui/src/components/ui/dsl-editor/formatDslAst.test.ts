import { describe, expect, it } from 'vitest'

import { formatDslAst } from './formatDslAst'

describe('formatDslAst', () => {
  it('formats path with trailing slash', () => {
    const ast = formatDslAst('/a/')
    expect(ast).toContain('Path "/a/"')
  })

  it('formats multi-segment URL paths without errors', () => {
    const ast = formatDslAst('https://example.com/api/v1/events/track')
    expect(ast).toContain('Path "/api/v1/events/track"')
    expect(ast).not.toContain('⚠ error')
  })

  it('reports parse errors in the tree', () => {
    const ast = formatDslAst('example.com AND (')
    expect(ast).toContain('⚠ error')
  })
})
