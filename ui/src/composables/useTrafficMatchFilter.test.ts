import { computed, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import type { TrafficRecord } from '@/components/ui/request-tree'

import { useTrafficMatchFilter } from './useTrafficMatchFilter'

vi.mock('@/components/ui/dsl-editor/dslWasm', () => ({
  isDslWasmLoaded: () => true,
  ensureDslWasm: vi.fn(),
  compileMatchExpr: vi.fn((source: string) => {
    if (source === 'invalid') {
      return { ok: false, error: 'parse error' }
    }
    return { ok: true, program: { id: source } }
  }),
  evalProgram: vi.fn((program: { id: string }, facts: { host: string }) => {
    if (program.id === 'example.com') {
      return facts.host === 'example.com'
    }
    if (program.id === 'example.com AND -X POST') {
      return facts.host === 'example.com'
    }
    return facts.host.includes(program.id)
  }),
}))

const sampleRecords: TrafficRecord[] = [
  {
    id: 'a',
    url: 'https://example.com/a',
    method: 'GET',
    status: 'success',
  },
  {
    id: 'b',
    url: 'https://other.com/b',
    method: 'GET',
    status: 'success',
  },
]

const recordsByTrace = {
  a: { url: 'https://example.com/a', method: 'GET' },
  b: { url: 'https://other.com/b', method: 'GET' },
}

describe('useTrafficMatchFilter', () => {
  it('returns all records when filter is empty', () => {
    const filterDsl = ref('')
    const { filteredRecords, filterState } = useTrafficMatchFilter({
      filterDsl,
      trafficRecords: computed(() => sampleRecords),
      recordsByTrace: ref(recordsByTrace),
    })

    expect(filterState.value).toBe('idle')
    expect(filteredRecords.value).toEqual(sampleRecords)
  })

  it('does not filter while typing until applyFilter is called', async () => {
    const filterDsl = ref('example.com')
    const { filteredRecords, filterState, applyFilter } = useTrafficMatchFilter({
      filterDsl,
      trafficRecords: computed(() => sampleRecords),
      recordsByTrace: ref(recordsByTrace),
    })

    expect(filterState.value).toBe('idle')
    expect(filteredRecords.value).toEqual(sampleRecords)

    await applyFilter()
    expect(filterState.value).toBe('valid')
    expect(filteredRecords.value.map(record => record.id)).toEqual(['a'])
  })

  it('keeps the previous filter results while editing without pressing enter', async () => {
    const filterDsl = ref('example.com')
    const { filteredRecords, applyFilter } = useTrafficMatchFilter({
      filterDsl,
      trafficRecords: computed(() => sampleRecords),
      recordsByTrace: ref(recordsByTrace),
    })

    await applyFilter()
    expect(filteredRecords.value.map(record => record.id)).toEqual(['a'])

    filterDsl.value = 'https://api.example-ex.com/'
    expect(filteredRecords.value.map(record => record.id)).toEqual(['a'])

    await applyFilter()
    expect(filteredRecords.value.map(record => record.id)).toEqual([])
  })

  it('does not show all records when submitted DSL is invalid', async () => {
    const filterDsl = ref('invalid')
    const { filteredRecords, filterState, filterError, applyFilter } = useTrafficMatchFilter({
      filterDsl,
      trafficRecords: computed(() => sampleRecords),
      recordsByTrace: ref(recordsByTrace),
    })

    expect(filteredRecords.value).toEqual(sampleRecords)

    await applyFilter()
    expect(filterState.value).toBe('invalid')
    expect(filterError.value).toBe('parse error')
    expect(filteredRecords.value).toEqual([])
  })

  it('clears the filter when applyFilter is called with empty input', async () => {
    const filterDsl = ref('example.com')
    const { filteredRecords, applyFilter } = useTrafficMatchFilter({
      filterDsl,
      trafficRecords: computed(() => sampleRecords),
      recordsByTrace: ref(recordsByTrace),
    })

    await applyFilter()
    expect(filteredRecords.value.map(record => record.id)).toEqual(['a'])

    filterDsl.value = ''
    await applyFilter()
    expect(filteredRecords.value).toEqual(sampleRecords)
  })

  it('reapplies the active filter when traffic updates after submit', async () => {
    vi.useFakeTimers()
    const trafficRecords = ref([...sampleRecords])
    const filterDsl = ref('example.com')
    const { filteredRecords, applyFilter } = useTrafficMatchFilter({
      filterDsl,
      trafficRecords: computed(() => trafficRecords.value),
      recordsByTrace: ref({
        ...recordsByTrace,
        c: { url: 'https://example.com/c', method: 'GET' },
      }),
    })

    await applyFilter()
    expect(filteredRecords.value.map(record => record.id)).toEqual(['a'])

    trafficRecords.value = [
      ...sampleRecords,
      {
        id: 'c',
        url: 'https://example.com/c',
        method: 'GET',
        status: 'success',
      },
    ]

    await vi.advanceTimersByTimeAsync(200)
    await vi.runAllTimersAsync()
    await Promise.resolve()
    await Promise.resolve()
    expect(filteredRecords.value.map(record => record.id)).toEqual(['a', 'c'])
    vi.useRealTimers()
  })
})
