import { beforeAll, describe, expect, it } from 'vitest'

import { dslWasmAvailable, setupDslWasmForTests } from '@/components/ui/dsl-editor/dslTestWasm'

import { createAction, createRuleDraft } from './types'
import type { RuleLocalFileActionDraft } from './types'
import { getMatchDslValidationErrors, getRuleValidationErrors } from './match-validation'

describe.skipIf(!dslWasmAvailable)('match-validation', () => {
  beforeAll(async () => {
    await setupDslWasmForTests()
  }, 120_000)

  it('rejects empty match DSL', () => {
    expect(getMatchDslValidationErrors('')).toEqual(['匹配表达式不能为空'])
    expect(getMatchDslValidationErrors('   ')).toEqual(['匹配表达式不能为空'])
  })

  it('rejects invalid syntax', () => {
    expect(getMatchDslValidationErrors('example.com AND (')).toEqual(['匹配表达式语法无效'])
  })

  it('accepts valid match DSL', () => {
    expect(getMatchDslValidationErrors('example.com AND /api')).toEqual([])
  })

  it('combines match and action validation errors', () => {
    const draft = createRuleDraft({
      matchDsl: 'example.com AND (',
      actions: [createAction({
        type: 'localFile',
        config: { filePath: '', contentType: '' },
      } as Partial<RuleLocalFileActionDraft>)],
    })

    const errors = getRuleValidationErrors(draft)
    expect(errors).toContain('匹配表达式语法无效')
    expect(errors).toContain('文件路径必填')
  })
})
