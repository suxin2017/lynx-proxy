import { beforeAll, describe, expect, it } from 'vitest'

import { dslStoryExamples } from './dslEditorStoryFixtures'
import { hasDslParseErrors } from './formatDsl'
import { dslWasmAvailable, setupDslWasmForTests } from './dslTestWasm'

describe.skipIf(!dslWasmAvailable)('dslStoryExamples', () => {
  beforeAll(async () => {
    await setupDslWasmForTests()
  }, 120_000)

  it('each example is a valid single DSL expression', () => {
    for (const example of dslStoryExamples) {
      expect(hasDslParseErrors(example.value), `expected valid DSL for "${example.label}"`).toBe(false)
    }
  })
})
