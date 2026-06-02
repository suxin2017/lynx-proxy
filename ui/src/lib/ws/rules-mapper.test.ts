import { describe, expect, it } from 'vitest'
import { cloneDraft, draftToRequestRule, requestRuleToDraft, requestRuleToListItem } from './rules-mapper'
import type { RequestRuleDto } from './rules-types'

const sampleRule: RequestRuleDto = {
  id: 1,
  name: 'Test Rule',
  description: 'desc',
  enabled: true,
  priority: 50,
  capture: { id: 1, matchExpr: 'example.com AND /api' },
  handlers: [
    {
      id: 10,
      name: 'Block',
      description: null,
      executionOrder: 100,
      enabled: true,
      handlerType: { type: 'block', statusCode: 403, reason: 'blocked' },
    },
  ],
}

describe('rules-mapper', () => {
  it('round-trips matchExpr and block handler', () => {
    const draft = requestRuleToDraft(sampleRule)
    expect(draft.matchDsl).toBe('example.com AND /api')
    expect(draft.actions[0]?.type).toBe('block')

    const back = draftToRequestRule(draft)
    expect(back.capture.matchExpr).toBe(sampleRule.capture.matchExpr)
    expect(back.handlers[0]?.handlerType.type).toBe('block')
  })

  it('builds list item with validation state', () => {
    const item = requestRuleToListItem(sampleRule)
    expect(item.id).toBe('1')
    expect(item.state).toBe('valid')
    expect(item.summary).toContain('example.com')
  })

  it('cloneDraft deep-copies without structuredClone', () => {
    const draft = requestRuleToDraft(sampleRule)
    const copy = cloneDraft(draft)
    expect(copy).toEqual(draft)
    expect(copy).not.toBe(draft)
    copy.name = 'mutated'
    expect(draft.name).toBe('Test Rule')
  })
})
