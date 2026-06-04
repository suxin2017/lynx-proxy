import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useCounterStore } from './counter.store'

describe('useCounterStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('increments, decrements, and resets count', () => {
    const store = useCounterStore()

    expect(store.count).toBe(0)

    store.increment()
    expect(store.count).toBe(1)

    store.decrement()
    expect(store.count).toBe(0)

    store.increment()
    store.increment()
    expect(store.doubleCount).toBe(4)

    store.reset()
    expect(store.count).toBe(0)
    expect(store.doubleCount).toBe(0)
  })
})
