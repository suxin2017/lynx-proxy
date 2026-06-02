import { nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import type { TrafficRecord } from './types'
import { useRequestTree } from './useRequestTree'

function makeRecord(id: string, url: string): TrafficRecord {
  return {
    id,
    url,
    method: 'GET',
    status: 'success',
  }
}

function topLevelGroupLabels(flatNodes: ReturnType<typeof useRequestTree>['flatNodes']['value']): string[] {
  return flatNodes
    .filter(node => node.type === 'group' && node.depth === 0)
    .map(node => node.label)
}

describe('useRequestTree', () => {
  it('restores all requests when the filtered list grows back after clearing input', async () => {
    vi.useFakeTimers()

    const all = [
      makeRecord('a', 'https://example.com/a'),
      makeRecord('b', 'https://other.com/b'),
      makeRecord('c', 'https://third.com/c'),
    ]

    const requests = ref([...all])
    const { flatNodes } = useRequestTree(requests, { debounceMs: 0, defaultExpandDepth: 1 })

    await vi.runAllTimersAsync()
    await nextTick()
    expect(topLevelGroupLabels(flatNodes.value).sort()).toEqual([
      'https://example.com/a',
      'https://other.com/b',
      'https://third.com/c',
    ])

    requests.value = [all[0]]
    await nextTick()
    expect(topLevelGroupLabels(flatNodes.value)).toEqual(['https://example.com/a'])

    requests.value = [...all]
    await nextTick()
    expect(topLevelGroupLabels(flatNodes.value).sort()).toEqual([
      'https://example.com/a',
      'https://other.com/b',
      'https://third.com/c',
    ])

    vi.useRealTimers()
  })
})
