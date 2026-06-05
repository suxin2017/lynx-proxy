import { onMounted, ref } from 'vue'
import {
  appendRequestHistory,
  clearRequestHistory,
  deleteRequestHistoryEntry,
  fetchRequestHistory,
} from '@/lib/http/api-studio-api'
import {
  mergeHistoryEntryWithSnapshot,
  normalizeHistoryEntry,
  snapshotDraftForHistory,
  snapshotResponseForHistory,
} from '../lib/history-response'
import type { ApiRequestDraft, ApiRequestHistoryEntry, ComposeResponse } from '../types'

export interface PushHistoryOptions {
  draft: ApiRequestDraft
  response?: ComposeResponse | null
  requestNodeId?: string
  tabId?: string
}

export function useApiRequestHistory() {
  const entries = ref<ApiRequestHistoryEntry[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function refresh() {
    loading.value = true
    error.value = null
    try {
      const res = await fetchRequestHistory()
      entries.value = res.entries.map(normalizeHistoryEntry)
    }
    catch (err) {
      error.value = String(err)
    }
    finally {
      loading.value = false
    }
  }

  onMounted(() => {
    void refresh()
  })

  async function pushHistory(options: PushHistoryOptions) {
    const { draft, response, requestNodeId, tabId } = options
    const url = draft.url.trim()
    if (!url) return

    try {
      const draftSnapshot = snapshotDraftForHistory(draft)
      const snapshot = snapshotResponseForHistory(response)
      const entry = await appendRequestHistory({
        sentAt: Date.now(),
        method: draftSnapshot.method,
        url,
        status: snapshot?.status ?? response?.status,
        statusText: snapshot?.statusText ?? response?.statusText,
        durationMs: snapshot?.responseTime ?? response?.responseTime,
        draft: draftSnapshot,
        response: snapshot,
        requestNodeId,
        tabId,
      })
      const merged = mergeHistoryEntryWithSnapshot(entry, draftSnapshot, snapshot)
      entries.value = [
        merged,
        ...entries.value.filter(item => item.id !== merged.id),
      ]
      return merged
    }
    catch (err) {
      error.value = String(err)
      return undefined
    }
  }

  async function removeEntry(id: string) {
    try {
      await deleteRequestHistoryEntry(id)
      entries.value = entries.value.filter(e => e.id !== id)
    }
    catch (err) {
      error.value = String(err)
    }
  }

  async function clearAll() {
    try {
      await clearRequestHistory()
      entries.value = []
    }
    catch (err) {
      error.value = String(err)
    }
  }

  return {
    entries,
    loading,
    error,
    refresh,
    pushHistory,
    removeEntry,
    clearAll,
  }
}
