import { onMounted, ref, watch } from 'vue'
import { WsOp } from '@/lib/generated/ws/v1'
import { useWsConnectionStore } from '@/stores'

export const DEFAULT_TRAFFIC_FILTER_HISTORY_LIMIT = 20

interface TrafficFilterHistoryPayload {
  entries: string[]
}

export function useTrafficFilterHistory() {
  const wsConnectionStore = useWsConnectionStore()
  const entries = ref<string[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function refresh() {
    if (!wsConnectionStore.isConnected) {
      return
    }

    loading.value = true
    error.value = null

    try {
      const history = await wsConnectionStore.call<TrafficFilterHistoryPayload>(
        WsOp.NetworkTrafficFilterHistoryGet,
      )
      entries.value = history.entries ?? []
    }
    catch (err) {
      error.value = String(err)
    }
    finally {
      loading.value = false
    }
  }

  async function push(expr: string) {
    const trimmed = expr.trim()
    if (!trimmed || !wsConnectionStore.isConnected) {
      return
    }

    try {
      const history = await wsConnectionStore.call<TrafficFilterHistoryPayload>(
        WsOp.NetworkTrafficFilterHistoryAppend,
        { expr: trimmed },
      )
      entries.value = history.entries ?? []
      error.value = null
    }
    catch (err) {
      error.value = String(err)
    }
  }

  async function clear() {
    if (!wsConnectionStore.isConnected) {
      entries.value = []
      return
    }

    try {
      const history = await wsConnectionStore.call<TrafficFilterHistoryPayload>(
        WsOp.NetworkTrafficFilterHistoryClear,
      )
      entries.value = history.entries ?? []
      error.value = null
    }
    catch (err) {
      error.value = String(err)
    }
  }

  onMounted(() => {
    if (wsConnectionStore.isConnected) {
      void refresh()
    }
  })

  watch(
    () => wsConnectionStore.isConnected,
    (connected) => {
      if (connected) {
        void refresh()
      }
    },
  )

  return {
    entries,
    loading,
    error,
    refresh,
    push,
    clear,
  }
}
