import { EditorState } from '@codemirror/state'
import { beforeAll, describe, expect, it } from 'vitest'

import { collectDslSyntaxDiagnostics } from './dslLint'
import { dslWasmAvailable, setupDslWasmForTests } from './dslTestWasm'

function diagnosticsFor(text: string) {
  const state = EditorState.create({ doc: text })
  return collectDslSyntaxDiagnostics(state)
}

describe.skipIf(!dslWasmAvailable)('collectDslSyntaxDiagnostics', () => {
  beforeAll(async () => {
    await setupDslWasmForTests()
  }, 120_000)

  it('returns no diagnostics for valid DSL', () => {
    expect(diagnosticsFor('example.com AND /api')).toEqual([])
  })

  it('returns no diagnostics for host space path (parsed as one URL)', () => {
    expect(diagnosticsFor('example.com /api')).toEqual([])
  })

  it('marks parse error ranges', () => {
    const input = 'example.com AND ('
    const diagnostics = diagnosticsFor(input)
    expect(diagnostics).toMatchObject([{ severity: 'error' }])
    expect(diagnostics.every(d => d.from >= 0 && d.to > d.from)).toBe(true)
  })
})
