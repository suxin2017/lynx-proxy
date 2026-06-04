import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue'

import type { TrafficRecord } from '@/components/ui/request-tree'
import {
  compileMatchExpr,
  ensureDslWasm,
  evalProgram,
  isDslWasmLoaded,
  type CompiledMatchProgram,
} from '@/components/ui/dsl-editor/dslWasm'
import {
  requestFactsCacheKey,
  requestFactsFromPartialRecord,
} from '@/lib/http/request-facts'
import type { PartialRequestRecord } from '@/stores/modules/request-stream-logic'

export type TrafficFilterState = 'idle' | 'loading' | 'valid' | 'invalid'

/** Wait for traffic stream bursts before re-evaluating an active filter. */
const REAPPLY_DEBOUNCE_MS = 300
/** Yield to the main thread every N records during eval. */
const EVAL_CHUNK_SIZE = 400

export interface UseTrafficMatchFilterOptions {
  filterDsl: Ref<string>
  trafficRecords: Ref<TrafficRecord[]>
  recordsByTrace: Ref<Record<string, PartialRequestRecord>>
}

export function useTrafficMatchFilter(options: UseTrafficMatchFilterOptions) {
  const filterState = ref<TrafficFilterState>('idle')
  const filterError = ref<string | undefined>(undefined)
  const submittedDsl = ref('')
  const compiledProgram = ref<CompiledMatchProgram | null>(null)
  const filteredRecords = ref<TrafficRecord[]>([])
  const lastAppliedRecords = ref<TrafficRecord[]>([])
  const appliedForDsl = ref('')
  const isApplyingFilter = ref(false)
  const factsCache = new Map<string, ReturnType<typeof requestFactsFromPartialRecord>>()

  let applyTimer: ReturnType<typeof setTimeout> | null = null
  let applyGeneration = 0

  const ensureWasmReady = (() => {
    let loading: Promise<void> | null = null
    return () => {
      if (isDslWasmLoaded()) {
        return Promise.resolve()
      }
      if (!loading) {
        loading = ensureDslWasm().then(() => undefined)
      }
      return loading
    }
  })()

  function clearApplyTimer() {
    if (applyTimer !== null) {
      clearTimeout(applyTimer)
      applyTimer = null
    }
  }

  function syncUnfilteredRecords() {
    filteredRecords.value = options.trafficRecords.value
    lastAppliedRecords.value = options.trafficRecords.value
    appliedForDsl.value = ''
  }

  function activeSubmittedDsl(): string {
    return submittedDsl.value.trim()
  }

  function scheduleApply(delay = REAPPLY_DEBOUNCE_MS) {
    clearApplyTimer()
    applyTimer = setTimeout(() => {
      applyTimer = null
      void runApplyFilter()
    }, delay)
  }

  async function runApplyFilter() {
    const generation = ++applyGeneration
    const trimmed = activeSubmittedDsl()
    const allRecords = options.trafficRecords.value

    if (!trimmed) {
      isApplyingFilter.value = false
      syncUnfilteredRecords()
      return
    }

    if (filterState.value !== 'valid' || !compiledProgram.value) {
      isApplyingFilter.value = false
      return
    }

    isApplyingFilter.value = true
    const program = compiledProgram.value
    const recordsByTrace = options.recordsByTrace.value
    const matched: TrafficRecord[] = []

    for (let start = 0; start < allRecords.length; start += EVAL_CHUNK_SIZE) {
      if (generation !== applyGeneration) {
        return
      }

      const end = Math.min(start + EVAL_CHUNK_SIZE, allRecords.length)
      for (let index = start; index < end; index += 1) {
        const record = allRecords[index]
        const partial = recordsByTrace[record.id]
        if (!partial) {
          continue
        }

        const cacheKey = requestFactsCacheKey(record.id, partial)
        let facts = factsCache.get(cacheKey)
        if (!facts) {
          facts = requestFactsFromPartialRecord(partial)
          factsCache.set(cacheKey, facts)
        }

        if (evalProgram(program, facts)) {
          matched.push(record)
        }
      }

      if (end < allRecords.length) {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 0)
        })
      }
    }

    if (generation !== applyGeneration) {
      return
    }

    filteredRecords.value = matched
    lastAppliedRecords.value = matched
    appliedForDsl.value = trimmed
    isApplyingFilter.value = false
  }

  async function applyFilter(source?: string) {
    clearApplyTimer()

    if (typeof source === 'string') {
      options.filterDsl.value = source
    }

    const trimmed = options.filterDsl.value.trim()
    submittedDsl.value = trimmed

    if (!trimmed) {
      applyGeneration += 1
      compiledProgram.value = null
      filterState.value = 'idle'
      filterError.value = undefined
      isApplyingFilter.value = false
      syncUnfilteredRecords()
      return
    }

    filterState.value = 'loading'
    filterError.value = undefined
    isApplyingFilter.value = false

    if (!isDslWasmLoaded()) {
      try {
        await ensureWasmReady()
      }
      catch {
        applyGeneration += 1
        compiledProgram.value = null
        filterState.value = 'invalid'
        filterError.value = 'DSL engine failed to load'
        appliedForDsl.value = trimmed
        return
      }
    }

    const result = compileMatchExpr(trimmed)
    if (!result.ok) {
      applyGeneration += 1
      compiledProgram.value = null
      filterState.value = 'invalid'
      filterError.value = result.error
      appliedForDsl.value = trimmed
      return
    }

    compiledProgram.value = result.program
    filterState.value = 'valid'
    filterError.value = undefined
    applyGeneration += 1
    await runApplyFilter()
  }

  watch(
    options.trafficRecords,
    (records, previous) => {
      const trimmed = activeSubmittedDsl()
      if (!trimmed) {
        return
      }

      if (filterState.value !== 'valid' || !compiledProgram.value) {
        return
      }

      if (previous && records.length >= previous.length) {
        scheduleApply()
        return
      }

      scheduleApply(0)
    },
  )

  watch(
    options.recordsByTrace,
    () => {
      factsCache.clear()

      if (!activeSubmittedDsl() || filterState.value !== 'valid' || !compiledProgram.value) {
        return
      }

      scheduleApply()
    },
  )

  const effectiveFilteredRecords = computed<TrafficRecord[]>(() => {
    const submitted = activeSubmittedDsl()

    if (!submitted) {
      return options.trafficRecords.value
    }

    if (appliedForDsl.value !== submitted) {
      if (filterState.value === 'invalid') {
        return []
      }
      return lastAppliedRecords.value
    }

    if (filterState.value === 'valid' && !isApplyingFilter.value) {
      return filteredRecords.value
    }

    if (filterState.value === 'invalid') {
      return []
    }

    return lastAppliedRecords.value
  })

  const matchCount = computed(() => effectiveFilteredRecords.value.length)
  const totalCount = computed(() => options.trafficRecords.value.length)

  onBeforeUnmount(() => {
    clearApplyTimer()
    applyGeneration += 1
  })

  return {
    filteredRecords: effectiveFilteredRecords,
    filterState,
    filterError,
    matchCount,
    totalCount,
    applyFilter,
  }
}
