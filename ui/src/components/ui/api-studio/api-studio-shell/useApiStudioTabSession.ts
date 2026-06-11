import { ref, watch, type Ref } from 'vue'
import type {
  ApiRequestHistoryEntry,
  ApiRequestTab,
  ApiStudioOpenTab,
  ApiStudioSidebarView,
  CollectionNode,
} from '../types'
import { isRequestNode } from '../lib/is-request-node'
import { snapshotResponseForHistory } from '../lib/history-response'
import {
  API_STUDIO_TAB_SESSION_VERSION,
  readApiStudioTabSession,
  resolveActiveTabId,
  writeApiStudioTabSession,
  type ApiStudioTabSession,
  type PersistedActiveTabRef,
  type PersistedTabRef,
} from '../lib/tab-session-storage'
import type { ComposeResponse } from '../types'

const PERSIST_DEBOUNCE_MS = 400

export interface UseApiStudioTabSessionOptions {
  enabled: Ref<boolean>
  hydrated: Ref<boolean>
  historyLoading: Ref<boolean>
  tabs: Ref<ApiStudioOpenTab[]>
  activeTabId: Ref<string | undefined>
  selectedId: Ref<string | undefined>
  sidebarView: Ref<ApiStudioSidebarView>
  nodes: Ref<CollectionNode[]>
  historyEntries: Ref<ApiRequestHistoryEntry[]>
  selectedHistoryId: Ref<string | undefined>
  openTabForNode: (
    requestNodeId: string,
    draftOverride?: import('../types').ApiRequestDraft,
    nodeHint?: CollectionNode,
  ) => import('../types').ApiStudioOpenTab | undefined
  onRestoreHistoryPreview?: (entry: ApiRequestHistoryEntry) => void
  onRestoreTabSessionRef?: (
    tabId: string,
    ref: {
      lastHistoryEntryId?: string
      lastResponse?: ComposeResponse
    },
  ) => void
}

export function useApiStudioTabSession(options: UseApiStudioTabSessionOptions) {
  const restored = ref(false)
  const isRestoring = ref(false)
  let persistTimer: ReturnType<typeof setTimeout> | undefined

  function buildSession(): ApiStudioTabSession {
    const tabs: PersistedTabRef[] = options.tabs.value
      .filter(tab => Boolean(tab.requestNodeId))
      .map(tab => ({
        kind: 'request' as const,
        requestNodeId: tab.requestNodeId,
        activeRequestTab: tab.activeRequestTab,
        lastHistoryEntryId: tab.lastHistoryEntryId,
        lastResponse: tab.response
          ? snapshotResponseForHistory(tab.response)
          : undefined,
      }))

    const activeTab = options.tabs.value.find(tab => tab.id === options.activeTabId.value)
    let active: PersistedActiveTabRef | undefined = activeTab?.requestNodeId
      ? { kind: 'request', requestNodeId: activeTab.requestNodeId }
      : undefined

    if (options.sidebarView.value === 'history' && options.selectedHistoryId.value) {
      active = { kind: 'history', entryId: options.selectedHistoryId.value }
    }

    return {
      version: API_STUDIO_TAB_SESSION_VERSION,
      tabs,
      active,
      selectedId: options.selectedId.value,
      sidebarView: options.sidebarView.value,
    }
  }

  function schedulePersist() {
    if (
      !options.enabled.value
      || isRestoring.value
      || !restored.value
      || typeof window === 'undefined'
    ) {
      return
    }
    if (persistTimer) clearTimeout(persistTimer)
    persistTimer = setTimeout(() => {
      persistTimer = undefined
      writeApiStudioTabSession(buildSession())
    }, PERSIST_DEBOUNCE_MS)
  }

  function applyEditorTab(tabId: string, editorTab: ApiRequestTab | undefined) {
    if (!editorTab) return
    options.tabs.value = options.tabs.value.map(tab =>
      tab.id === tabId ? { ...tab, activeRequestTab: editorTab } : tab,
    )
  }

  async function restoreSession() {
    if (!options.enabled.value || restored.value || !options.hydrated.value) {
      return
    }

    const session = readApiStudioTabSession()
    if (!session) {
      restored.value = true
      return
    }

    if (session.active?.kind === 'history' && options.historyLoading.value) {
      return
    }

    isRestoring.value = true

    for (const ref of session.tabs) {
      if (ref.kind !== 'request') continue
      const node = options.nodes.value.find(item => item.id === ref.requestNodeId)
      if (!node || !isRequestNode(node)) continue
      const opened = options.openTabForNode(ref.requestNodeId, undefined, node)
      if (opened) {
        if (ref.activeRequestTab) {
          applyEditorTab(opened.id, ref.activeRequestTab)
        }
        if (ref.lastHistoryEntryId || ref.lastResponse) {
          options.onRestoreTabSessionRef?.(opened.id, {
            lastHistoryEntryId: ref.lastHistoryEntryId,
            lastResponse: ref.lastResponse,
          })
        }
      }
    }

    const activeId = resolveActiveTabId(session.active, options.tabs.value)
    if (activeId) {
      options.activeTabId.value = activeId
    }
    else if (options.tabs.value.length > 0) {
      options.activeTabId.value = options.tabs.value[0]?.id
    }

    if (session.selectedId && options.nodes.value.some(node => node.id === session.selectedId)) {
      options.selectedId.value = session.selectedId
    }
    else {
      const active = options.tabs.value.find(tab => tab.id === options.activeTabId.value)
      if (active?.requestNodeId) {
        options.selectedId.value = active.requestNodeId
      }
    }

    if (session.sidebarView) {
      options.sidebarView.value = session.sidebarView
    }

    const activeRef = session.active
    if (activeRef?.kind === 'history') {
      const entry = options.historyEntries.value.find(
        item => item.id === activeRef.entryId,
      )
      if (entry) {
        options.selectedHistoryId.value = entry.id
        options.onRestoreHistoryPreview?.(entry)
      }
    }

    isRestoring.value = false
    restored.value = true
  }

  watch(
    () => [options.hydrated.value, options.historyLoading.value] as const,
    () => {
      void restoreSession()
    },
    { immediate: true },
  )

  watch(
    options.historyEntries,
    () => {
      if (!restored.value) {
        void restoreSession()
      }
    },
    { deep: false },
  )

  watch(
    [
      options.tabs,
      options.activeTabId,
      options.selectedId,
      options.sidebarView,
      options.selectedHistoryId,
    ],
    schedulePersist,
    { deep: true },
  )

  return {
    isRestoring,
    restored,
    flushPersist: () => {
      if (persistTimer) {
        clearTimeout(persistTimer)
        persistTimer = undefined
      }
      if (options.enabled.value) {
        writeApiStudioTabSession(buildSession())
      }
    },
  }
}
