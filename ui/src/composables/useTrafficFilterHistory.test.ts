import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'

import { WsOp } from '@/lib/generated/ws/v1'

const isConnected = ref(true)
const wsMock = {
  call: vi.fn(async (_op?: string, _payload?: Record<string, unknown>) => ({ entries: [] as string[] })),
  isConnected,
}

vi.mock('@/stores/modules/ws-connection.store', () => ({
  useWsConnectionStore: () => wsMock,
}))

import { useTrafficFilterHistory } from './useTrafficFilterHistory'

beforeEach(() => {
  setActivePinia(createPinia())
  wsMock.call.mockReset()
  isConnected.value = true
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

  it('push skips WS call when disconnected', async () => {
    isConnected.value = false

    const { push } = useTrafficFilterHistory()
    await push('example.com')

    expect(wsMock.call).not.toHaveBeenCalled()
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

  it('clear clears local entries when disconnected without WS call', async () => {
    wsMock.call.mockImplementation(async (op) => {
      if (op === WsOp.NetworkTrafficFilterHistoryGet) {
        return { entries: ['example.com'] }
      }
      return { entries: [] }
    })

    const { entries, clear, refresh } = useTrafficFilterHistory()
    await refresh()
    expect(entries.value).toEqual(['example.com'])

    wsMock.call.mockReset()
    isConnected.value = false
    await clear()

    expect(entries.value).toEqual([])
    expect(wsMock.call).not.toHaveBeenCalled()
  })
})
