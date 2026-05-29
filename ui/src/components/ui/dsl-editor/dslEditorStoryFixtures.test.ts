import { describe, expect, it } from 'vitest'

import { dslStoryExamples } from './dslEditorStoryFixtures'
import { parseDsl } from './dslParse'

function hasParseError(source: string) {
  let found = false
  parseDsl(source).iterate({
    enter(node) {
      if (node.type.isError) {
        found = true
      }
    },
  })
  return found
}

describe('dslStoryExamples', () => {
  it('each example is a valid single DSL expression', () => {
    for (const example of dslStoryExamples) {
      expect(hasParseError(example.value), `expected valid DSL for "${example.label}"`).toBe(false)
    }
  })
})
