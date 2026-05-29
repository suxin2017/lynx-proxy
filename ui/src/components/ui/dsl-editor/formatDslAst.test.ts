import { beforeAll, describe, expect, it } from 'vitest'

import { dslWasmAvailable, setupDslWasmForTests } from './dslTestWasm'
import { formatDslAst } from './formatDslAst'

describe.skipIf(!dslWasmAvailable)('formatDslAst', () => {
  beforeAll(async () => {
    await setupDslWasmForTests()
  }, 120_000)

  it('renders path operand', () => {
    const ast = formatDslAst('/a/')
    expect(ast).toContain('Program')
    expect(ast).toContain('Path')
    expect(ast).toContain('"/a/"')
  })

  it('renders URL structure', () => {
    const ast = formatDslAst('https://example.com/api/v1/events/track')
    expect(ast).toContain('Scheme')
    expect(ast).toContain('Host')
    expect(ast).toContain('Path')
  })

  it('reports parse errors', () => {
    expect(formatDslAst('example.com AND (')).toBe('(parse error)')
  })

  it('renders grouped OR branches in inspect AST', () => {
    const ast = formatDslAst(
      '(\n  example.com\n  OR /api/\n)\nAND NOT https://example.com/health',
    )
    expect(ast).toContain('Program')
    expect(ast).toContain('Grouped')
    expect(ast).toContain('OrExpr')
    expect(ast).toMatch(/Host.*example\.com/)
    expect(ast).toContain('Path')
    expect(ast).toContain('/api')
  })
})
