import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

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

import { WsOp } from '@/lib/generated/ws/v1'
import { useCaptureRulesStore } from './capture-rules.store'
import { useWsConnectionStore } from './ws-connection.store'

describe('capture-rules.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    wsMock.call.mockReset()
  })

  it('upsertFocus calls correct ws op', async () => {
    const store = useCaptureRulesStore()

    wsMock.call.mockResolvedValueOnce({ id: 1, name: 'x', enabled: true, matchExpr: 'example.com', createdAt: 0, updatedAt: 0 })
    wsMock.call.mockResolvedValueOnce({ rules: [] })
    wsMock.call.mockResolvedValueOnce({ rules: [] })

    await store.upsertFocus({ name: 'x', enabled: true, matchExpr: 'example.com' })

    expect(wsMock.call).toHaveBeenCalledWith(WsOp.CaptureRulesFocusUpsert, expect.objectContaining({
      name: 'x',
      enabled: true,
      matchExpr: 'example.com',
    }))
  })
})

