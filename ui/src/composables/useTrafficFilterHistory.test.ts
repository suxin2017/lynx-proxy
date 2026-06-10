import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { WsOp } from '@/lib/generated/ws/v1'

const wsMock = {
  call: vi.fn(async () => ({ entries: [] })),
  isConnected: true,
}

vi.mock('@/stores/modules/ws-connection.store', () => ({
  useWsConnectionStore: () => wsMock,
}))

import { useTrafficFilterHistory } from './useTrafficFilterHistory'

beforeEach(() => {
  setActivePinia(createPinia())
  wsMock.call.mockReset()
  wsMock.isConnected = true
})

describe('useTrafficFilterHistory', () => {
  it('push updates entries from WS response', async () => {
    wsMock.call.mockImplementation(async (op, payload) => {
      if (op === WsOp.NetworkTrafficFilterHistoryAppend) {
        return { entries: [payload?.expr as string] }
      }
      return { entries: [] }
    })

    const { entries, push } = useTrafficFilterHistory()
    await push('example.com')

    expect(entries.value).toEqual(['example.com'])
  })

  it('clear resets entries from WS response', async () => {
    wsMock.call.mockImplementation(async (op) => {
      if (op === WsOp.NetworkTrafficFilterHistoryGet) {
        return { entries: ['example.com'] }
      }
      if (op === WsOp.NetworkTrafficFilterHistoryClear) {
        return { entries: [] }
      }
      return { entries: [] }
    })

    const { entries, clear, refresh } = useTrafficFilterHistory()
    await refresh()
    expect(entries.value).toEqual(['example.com'])

    await clear()
    expect(entries.value).toEqual([])
  })
})
