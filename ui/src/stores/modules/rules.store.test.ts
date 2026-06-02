import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { WsOp } from '@/lib/generated/ws/v1'
import { useRulesStore } from './rules.store'

const wsMock = {
  call: vi.fn(async () => ({})),
}

vi.mock('./ws-connection.store', () => {
  return {
    useWsConnectionStore: () => ({
      call: wsMock.call,
    }),
  }
})

describe('rules.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    wsMock.call.mockReset()
  })

  it('duplicateRule creates new draft id and resets action ids', async () => {
    const store = useRulesStore()

    wsMock.call.mockResolvedValueOnce({
      id: 1,
      name: 'Rule A',
      description: '',
      enabled: true,
      priority: 50,
      capture: { id: 1, matchExpr: 'example.com' },
      handlers: [
        {
          id: 123,
          enabled: true,
          executionOrder: 10,
          handlerType: { type: 'modifyRequest', modifyHeaders: {}, modifyMethod: null, modifyUrl: null, modifyBody: null },
        },
      ],
    })

    await store.duplicateRule('1')

    expect(store.selectedRuleId.startsWith('draft-')).toBe(true)
    expect(store.ruleDraft?.id.startsWith('draft-')).toBe(true)
    expect(store.ruleDraft?.name).toBe('Rule A 副本')
    expect(store.ruleDraft?.actions.length).toBe(1)

    const actionId = store.ruleDraft?.actions[0]?.id ?? ''
    expect(actionId).toMatch(/^act-/)
    expect(actionId).not.toMatch(/^act-\d+$/)
    expect(wsMock.call).toHaveBeenCalledWith(WsOp.RulesGet, { ruleId: 1 })
  })

  it('moveRuleDown swaps list order and persists priority as 10000-index', async () => {
    const store = useRulesStore()

    const rule1 = {
      id: 1,
      name: 'Rule 1',
      description: '',
      enabled: true,
      priority: 10000,
      capture: { id: 1, matchExpr: '/a' },
      handlers: [
        {
          id: 11,
          enabled: true,
          executionOrder: 10,
          handlerType: { type: 'modifyRequest', modifyHeaders: {}, modifyMethod: null, modifyUrl: null, modifyBody: null },
        },
      ],
    }

    const rule2 = {
      id: 2,
      name: 'Rule 2',
      description: '',
      enabled: true,
      priority: 9999,
      capture: { id: 2, matchExpr: '/b' },
      handlers: [
        {
          id: 22,
          enabled: true,
          executionOrder: 10,
          handlerType: { type: 'modifyRequest', modifyHeaders: {}, modifyMethod: null, modifyUrl: null, modifyBody: null },
        },
      ],
    }

    wsMock.call
      .mockResolvedValueOnce({ rules: [rule1, rule2] }) // refreshRules
      .mockResolvedValueOnce({ ...rule2, priority: 10000 }) // save rule2
      .mockResolvedValueOnce({ ...rule1, priority: 9999 }) // save rule1
      .mockResolvedValueOnce({ rules: [{ ...rule2, priority: 10000 }, { ...rule1, priority: 9999 }] }) // refreshRules after reorder

    await store.refreshRules()
    expect(store.rules.map(r => r.id)).toEqual(['1', '2'])

    await store.moveRuleDown('1')

    const calls = wsMock.call.mock.calls
    expect(calls[0]?.[0]).toBe(WsOp.RulesListGet)
    expect(calls[1]?.[0]).toBe(WsOp.RulesSaveSet)
    expect(calls[1]?.[1]).toMatchObject({ id: 2, priority: 10000 })
    expect(calls[2]?.[0]).toBe(WsOp.RulesSaveSet)
    expect(calls[2]?.[1]).toMatchObject({ id: 1, priority: 9999 })
    expect(calls[3]?.[0]).toBe(WsOp.RulesListGet)
  })

  it('reorderRules persists priority as 10000-index', async () => {
    const store = useRulesStore()

    const rule1 = {
      id: 1,
      name: 'Rule 1',
      description: '',
      enabled: true,
      priority: 10000,
      capture: { id: 1, matchExpr: '/a' },
      handlers: [
        {
          id: 11,
          enabled: true,
          executionOrder: 10,
          handlerType: { type: 'modifyRequest', modifyHeaders: {}, modifyMethod: null, modifyUrl: null, modifyBody: null },
        },
      ],
    }

    const rule2 = {
      id: 2,
      name: 'Rule 2',
      description: '',
      enabled: true,
      priority: 9999,
      capture: { id: 2, matchExpr: '/b' },
      handlers: [
        {
          id: 22,
          enabled: true,
          executionOrder: 10,
          handlerType: { type: 'modifyRequest', modifyHeaders: {}, modifyMethod: null, modifyUrl: null, modifyBody: null },
        },
      ],
    }

    wsMock.call
      .mockResolvedValueOnce({ rules: [rule1, rule2] }) // refreshRules
      .mockResolvedValueOnce({ ...rule2, priority: 10000 }) // save rule2
      .mockResolvedValueOnce({ ...rule1, priority: 9999 }) // save rule1
      .mockResolvedValueOnce({ rules: [{ ...rule2, priority: 10000 }, { ...rule1, priority: 9999 }] }) // refreshRules after reorder

    await store.refreshRules()
    await store.reorderRules(['2', '1'])

    const calls = wsMock.call.mock.calls
    expect(calls[0]?.[0]).toBe(WsOp.RulesListGet)
    expect(calls[1]?.[0]).toBe(WsOp.RulesSaveSet)
    expect(calls[1]?.[1]).toMatchObject({ id: 2, priority: 10000 })
    expect(calls[2]?.[0]).toBe(WsOp.RulesSaveSet)
    expect(calls[2]?.[1]).toMatchObject({ id: 1, priority: 9999 })
    expect(calls[3]?.[0]).toBe(WsOp.RulesListGet)
  })
})

