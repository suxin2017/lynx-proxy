import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type { RequestViewMode } from '@/components/ui/network-panels'

const VIEW_MODE_STORAGE_KEY = 'lynx.network.viewMode'
const SPLIT_RATIO_STORAGE_KEY = 'lynx.network.splitRatio'
const TABLE_SPLIT_RATIO_STORAGE_KEY = 'lynx.network.tableSplitRatio'
const STREAM_ENABLED_STORAGE_KEY = 'lynx.network.streamEnabled'
const TRAFFIC_FILTER_DSL_STORAGE_KEY = 'lynx.network.trafficFilterDsl'
const TRAFFIC_FILTER_HISTORY_STORAGE_KEY = 'lynx.network.trafficFilterHistory'

export const DEFAULT_SPLIT_RATIO = 42
export const DEFAULT_TABLE_SPLIT_RATIO = 44
export const DEFAULT_TRAFFIC_FILTER_HISTORY_LIMIT = 20

const clampSplitRatio = (value: number) => Math.min(80, Math.max(20, value))

export const useSettingsStore = defineStore('settings', () => {
  const viewMode = ref<RequestViewMode>('table')
  const splitRatio = ref(DEFAULT_SPLIT_RATIO)
  const tableSplitRatio = ref(DEFAULT_TABLE_SPLIT_RATIO)
  const streamEnabled = ref(true)
  const trafficFilterDsl = ref('')
  const trafficFilterHistory = ref<string[]>([])

  let hydrated = false

  function persistViewMode(mode: RequestViewMode) {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode)
  }

  function persistSplitRatio(value: number) {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(SPLIT_RATIO_STORAGE_KEY, value.toFixed(2))
  }

  function persistTableSplitRatio(value: number) {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(TABLE_SPLIT_RATIO_STORAGE_KEY, value.toFixed(2))
  }

  function persistStreamEnabled(enabled: boolean) {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(STREAM_ENABLED_STORAGE_KEY, enabled ? '1' : '0')
  }

  function persistTrafficFilterDsl(value: string) {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(TRAFFIC_FILTER_DSL_STORAGE_KEY, value)
  }

  function persistTrafficFilterHistory(values: string[]) {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(TRAFFIC_FILTER_HISTORY_STORAGE_KEY, JSON.stringify(values))
  }

  function hydrate() {
    if (hydrated || typeof window === 'undefined') {
      return
    }

    const storedMode = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY)
    if (storedMode === 'table' || storedMode === 'tree') {
      viewMode.value = storedMode
    }

    const storedRatio = Number(window.localStorage.getItem(SPLIT_RATIO_STORAGE_KEY))
    if (Number.isFinite(storedRatio)) {
      splitRatio.value = clampSplitRatio(storedRatio)
    }

    const storedTableRatio = Number(window.localStorage.getItem(TABLE_SPLIT_RATIO_STORAGE_KEY))
    if (Number.isFinite(storedTableRatio)) {
      tableSplitRatio.value = clampSplitRatio(storedTableRatio)
    }

    const storedStreamEnabled = window.localStorage.getItem(STREAM_ENABLED_STORAGE_KEY)
    if (storedStreamEnabled === '0') {
      streamEnabled.value = false
    }

    const storedTrafficFilterDsl = window.localStorage.getItem(TRAFFIC_FILTER_DSL_STORAGE_KEY)
    if (storedTrafficFilterDsl !== null) {
      trafficFilterDsl.value = storedTrafficFilterDsl
    }

    const storedTrafficFilterHistory = window.localStorage.getItem(TRAFFIC_FILTER_HISTORY_STORAGE_KEY)
    if (storedTrafficFilterHistory) {
      try {
        const parsed = JSON.parse(storedTrafficFilterHistory)
        if (Array.isArray(parsed) && parsed.every(v => typeof v === 'string')) {
          trafficFilterHistory.value = parsed
            .map(v => v.trim())
            .filter(Boolean)
            .slice(0, DEFAULT_TRAFFIC_FILTER_HISTORY_LIMIT)
        }
      }
      catch {
        // Ignore invalid storage payload.
      }
    }

    hydrated = true
  }

  function pushTrafficFilterHistory(expr: string) {
    const trimmed = expr.trim()
    if (!trimmed) {
      return
    }

    const next = trafficFilterHistory.value.filter(v => v !== trimmed)
    next.unshift(trimmed)
    trafficFilterHistory.value = next.slice(0, DEFAULT_TRAFFIC_FILTER_HISTORY_LIMIT)
  }

  function clearTrafficFilterHistory() {
    trafficFilterHistory.value = []
  }

  function resetNetworkPreferences() {
    viewMode.value = 'table'
    splitRatio.value = DEFAULT_SPLIT_RATIO
    tableSplitRatio.value = DEFAULT_TABLE_SPLIT_RATIO
    streamEnabled.value = true
    trafficFilterDsl.value = ''
    trafficFilterHistory.value = []

    persistViewMode(viewMode.value)
    persistSplitRatio(splitRatio.value)
    persistTableSplitRatio(tableSplitRatio.value)
    persistStreamEnabled(streamEnabled.value)
    persistTrafficFilterDsl(trafficFilterDsl.value)
    persistTrafficFilterHistory(trafficFilterHistory.value)
  }

  watch(viewMode, persistViewMode)

  watch(splitRatio, (value) => {
    const clamped = clampSplitRatio(value)
    if (Math.abs(clamped - value) > 0.01) {
      splitRatio.value = clamped
      return
    }

    persistSplitRatio(clamped)
  })

  watch(tableSplitRatio, (value) => {
    const clamped = clampSplitRatio(value)
    if (Math.abs(clamped - value) > 0.01) {
      tableSplitRatio.value = clamped
      return
    }

    persistTableSplitRatio(clamped)
  })

  watch(streamEnabled, persistStreamEnabled)

  watch(trafficFilterDsl, persistTrafficFilterDsl)

  watch(trafficFilterHistory, persistTrafficFilterHistory, { deep: true })

  return {
    viewMode,
    splitRatio,
    tableSplitRatio,
    streamEnabled,
    trafficFilterDsl,
    trafficFilterHistory,
    hydrate,
    pushTrafficFilterHistory,
    clearTrafficFilterHistory,
    resetNetworkPreferences,
  }
})
