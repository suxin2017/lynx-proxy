import { beforeAll, describe, expect, it } from 'vitest'

import { dslWasmAvailable, setupDslWasmForTests } from './dslTestWasm'
import { formatDslInspect } from './formatDslInspect'

describe.skipIf(!dslWasmAvailable)('formatDslInspect', () => {
  beforeAll(async () => {
    await setupDslWasmForTests()
  }, 120_000)

  it('delegates to AST formatter', () => {
    const text = formatDslInspect('/a/')
    expect(text).toContain('Program')
    expect(text).toContain('Path')
  })
})
