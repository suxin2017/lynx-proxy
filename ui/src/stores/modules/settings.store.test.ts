import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { DEFAULT_TRAFFIC_FILTER_HISTORY_LIMIT, useSettingsStore } from './settings.store'

type MemoryStorage = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  clear(): void
}

function createMemoryStorage(): MemoryStorage {
  const store = new Map<string, string>()
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, String(value))
    },
    removeItem: (key) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  const localStorage = createMemoryStorage()
  ;(globalThis as any).window = { localStorage }
  localStorage.clear()
})

describe('settings.store trafficFilterHistory', () => {
  it('pushTrafficFilterHistory dedupes and prepends', () => {
    const store = useSettingsStore()
    store.pushTrafficFilterHistory('example.com')
    store.pushTrafficFilterHistory('other.com')
    store.pushTrafficFilterHistory('example.com')

    expect(store.trafficFilterHistory).toEqual(['example.com', 'other.com'])
  })

  it('pushTrafficFilterHistory trims and ignores empty', () => {
    const store = useSettingsStore()
    store.pushTrafficFilterHistory('   ')
    store.pushTrafficFilterHistory('  example.com  ')

    expect(store.trafficFilterHistory).toEqual(['example.com'])
  })

  it('pushTrafficFilterHistory enforces max length', () => {
    const store = useSettingsStore()
    for (let i = 0; i < DEFAULT_TRAFFIC_FILTER_HISTORY_LIMIT + 5; i += 1) {
      store.pushTrafficFilterHistory(`v${i}`)
    }

    expect(store.trafficFilterHistory.length).toBe(DEFAULT_TRAFFIC_FILTER_HISTORY_LIMIT)
    expect(store.trafficFilterHistory[0]).toBe(`v${DEFAULT_TRAFFIC_FILTER_HISTORY_LIMIT + 4}`)
  })

  it('hydrates history from localStorage and sanitizes', () => {
    window.localStorage.setItem('lynx.network.trafficFilterHistory', JSON.stringify([
      ' example.com ',
      '',
      'other.com',
    ]))

    const store = useSettingsStore()
    store.hydrate()

    expect(store.trafficFilterHistory).toEqual(['example.com', 'other.com'])
  })

  it('clearTrafficFilterHistory clears the list', () => {
    const store = useSettingsStore()
    store.pushTrafficFilterHistory('example.com')
    store.clearTrafficFilterHistory()
    expect(store.trafficFilterHistory).toEqual([])
  })
})

