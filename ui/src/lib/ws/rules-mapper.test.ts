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
      executionOrder: 100,
      enabled: true,
      handlerType: { type: 'block', statusCode: 403, reason: 'blocked' },
    },
  ],
}

const throttleRule: RequestRuleDto = {
  id: 2,
  name: 'Throttle Rule',
  description: 'desc',
  enabled: true,
  priority: 50,
  capture: { id: 2, matchExpr: '/api' },
  handlers: [
    {
      id: 20,
      executionOrder: 100,
      enabled: true,
      handlerType: {
        type: 'throttle',
        preset: 'fast3G',
        downloadKbps: undefined,
        uploadKbps: undefined,
        latencyMs: undefined,
      },
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

  it('round-trips throttle handler preset', () => {
    const draft = requestRuleToDraft(throttleRule)
    expect(draft.actions[0]?.type).toBe('throttle')
    if (draft.actions[0]?.type !== 'throttle') {
      throw new Error('expected throttle action')
    }
    expect(draft.actions[0].config.preset).toBe('Fast3G')

    const back = draftToRequestRule(draft)
    expect(back.handlers[0]?.handlerType.type).toBe('throttle')
    expect((back.handlers[0]?.handlerType as any).preset).toBe('fast3G')
  })

  it('builds list item with validation state', () => {
    const item = requestRuleToListItem(sampleRule)
    expect(item.id).toBe('1')
    expect(item.state).toBe('valid')
    expect(item.summary).toContain('example.com')
  })

  it('omits empty proxyForward fields when saving', () => {
    const draft = requestRuleToDraft({
      ...sampleRule,
      handlers: [
        {
          id: 11,
          executionOrder: 10,
          enabled: true,
          handlerType: {
            type: 'proxyForward',
            targetScheme: '',
            targetAuthority: '127.0.0.1:8000',
            targetPath: '  ',
          },
        },
      ],
    })
    expect(draft.actions[0]?.type).toBe('proxyForward')
    if (draft.actions[0]?.type !== 'proxyForward') {
      throw new Error('expected proxyForward action')
    }
    expect(draft.actions[0].config.targetScheme).toBe('')
    expect(draft.actions[0].config.targetPath).toBe('')

    const back = draftToRequestRule(draft)
    const handler = back.handlers[0]?.handlerType
    expect(handler?.type).toBe('proxyForward')
    if (handler?.type !== 'proxyForward') {
      throw new Error('expected proxyForward handler')
    }
    expect(handler.targetScheme).toBeUndefined()
    expect(handler.targetAuthority).toBe('127.0.0.1:8000')
    expect(handler.targetPath).toBeUndefined()
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
