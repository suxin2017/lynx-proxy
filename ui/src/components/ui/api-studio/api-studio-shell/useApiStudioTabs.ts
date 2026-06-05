import { computed, ref, type Ref } from 'vue'
import type {
  ApiRequestDraft,
  ApiRequestHistoryEntry,
  ApiStudioOpenTab,
  CollectionNode,
  ComposeResponse,
} from '../types'
import { cloneDraft } from '../lib/clone-draft'
import { createEmptyApiDraft } from '../lib/empty-api-draft'
import { isRequestNode } from '../lib/is-request-node'

function resolveDraft(
  node: CollectionNode,
  drafts?: Record<string, ApiRequestDraft>,
): ApiRequestDraft {
  const fromProps = node.draftId && drafts?.[node.draftId]
  if (fromProps) return cloneDraft(fromProps)
  return createEmptyApiDraft({
    name: node.name,
    method: node.method ?? 'GET',
  })
}

export function useApiStudioTabs(
  nodes: Ref<CollectionNode[]>,
  options: {
    drafts?: Ref<Record<string, ApiRequestDraft> | undefined>
    onDraftsChange?: (drafts: Record<string, ApiRequestDraft>) => void
  } = {},
) {
  const tabs = ref<ApiStudioOpenTab[]>([])
  const activeTabId = ref<string | undefined>(undefined)

  const activeTab = computed(() =>
    tabs.value.find(tab => tab.id === activeTabId.value),
  )

  function setDraftForNode(draftId: string, draft: ApiRequestDraft) {
    const current = { ...(options.drafts?.value ?? {}) }
    current[draftId] = cloneDraft(draft)
    options.onDraftsChange?.(current)
  }

  function tabIdForNode(requestNodeId: string) {
    return `tab-${requestNodeId}`
  }

  function syncRequestTabTitle(requestNodeId: string, title: string) {
    const trimmed = title.trim()
    if (!trimmed) return
    tabs.value = tabs.value.map(tab =>
      tab.requestNodeId === requestNodeId
        ? { ...tab, title: trimmed, draft: { ...tab.draft, name: trimmed } }
        : tab,
    )
  }

  function openTabForNode(
    requestNodeId: string,
    draftOverride?: ApiRequestDraft,
    nodeHint?: CollectionNode,
  ) {
    const node = nodeHint ?? nodes.value.find(item => item.id === requestNodeId)
    if (!node || !isRequestNode(node)) return

    const existing = tabs.value.find(tab => tab.requestNodeId === requestNodeId)
    if (existing) {
      if (draftOverride) {
        tabs.value = tabs.value.map(tab =>
          tab.id === existing.id ? { ...tab, draft: cloneDraft(draftOverride), dirty: true } : tab,
        )
      }
      activeTabId.value = existing.id
      return existing
    }

    const draft = draftOverride ?? resolveDraft(node, options.drafts?.value)
    const tab: ApiStudioOpenTab = {
      id: tabIdForNode(requestNodeId),
      requestNodeId,
      title: node.name,
      method: node.method,
      draft: cloneDraft(draft),
      response: null,
      loading: false,
      error: null,
      activeRequestTab: 'params',
      dirty: Boolean(draftOverride),
    }
    tabs.value = [...tabs.value, tab]
    activeTabId.value = tab.id
    return tab
  }

  function openTabFromHistory(entry: ApiRequestHistoryEntry) {
    if (entry.requestNodeId) {
      const node = nodes.value.find(n => n.id === entry.requestNodeId)
      if (node?.kind === 'request' && node.draftId) {
        setDraftForNode(node.draftId, entry.draft)
      }
      return openTabForNode(entry.requestNodeId, entry.draft)
    }

    const id = `tab-history-${entry.id}`
    const existing = tabs.value.find(t => t.id === id)
    if (existing) {
      activeTabId.value = existing.id
      return existing
    }

    const tab: ApiStudioOpenTab = {
      id,
      requestNodeId: '',
      title: entry.draft.name || entry.url,
      method: entry.method,
      draft: cloneDraft(entry.draft),
      response: null,
      loading: false,
      error: null,
      activeRequestTab: 'params',
      dirty: true,
    }
    tabs.value = [...tabs.value, tab]
    activeTabId.value = tab.id
    return tab
  }

  function bindTabToRequest(
    tabId: string,
    node: CollectionNode,
    draft: ApiRequestDraft,
  ) {
    if (node.kind !== 'request' || !node.draftId) return

    setDraftForNode(node.draftId, draft)

    const newTabId = tabIdForNode(node.id)
    tabs.value = tabs.value.map((tab) => {
      if (tab.id !== tabId) return tab
      return {
        ...tab,
        id: newTabId,
        requestNodeId: node.id,
        title: node.name,
        method: node.method,
        draft: cloneDraft(draft),
        dirty: false,
      }
    })
    activeTabId.value = newTabId
  }

  function reorderTabs(next: ApiStudioOpenTab[]) {
    tabs.value = next
  }

  function closeTabsForRequestNodes(requestNodeIds: Iterable<string>) {
    const ids = new Set(requestNodeIds)
    if (ids.size === 0) return
    const toClose = tabs.value.filter(
      tab => tab.requestNodeId && ids.has(tab.requestNodeId),
    )
    for (const tab of toClose) {
      closeTab(tab.id)
    }
  }

  function closeTab(tabId: string) {
    const index = tabs.value.findIndex(tab => tab.id === tabId)
    if (index < 0) return

    const nextTabs = tabs.value.filter(tab => tab.id !== tabId)
    tabs.value = nextTabs

    if (activeTabId.value !== tabId) return

    if (nextTabs.length === 0) {
      activeTabId.value = undefined
      return
    }

    const nextIndex = Math.min(index, nextTabs.length - 1)
    activeTabId.value = nextTabs[nextIndex]?.id
  }

  function updateActiveTabDraft(draft: ApiRequestDraft) {
    const id = activeTabId.value
    if (!id) return
    tabs.value = tabs.value.map(tab =>
      tab.id === id ? { ...tab, draft, dirty: true, method: draft.method } : tab,
    )
  }

  function clearTabDirty(tabId: string) {
    tabs.value = tabs.value.map(tab =>
      tab.id === tabId ? { ...tab, dirty: false } : tab,
    )
  }

  function updateActiveTabResponse(response: ComposeResponse | null) {
    const id = activeTabId.value
    if (!id) return
    tabs.value = tabs.value.map(tab =>
      tab.id === id ? { ...tab, response } : tab,
    )
  }

  function setActiveTabLoading(loading: boolean) {
    const id = activeTabId.value
    if (!id) return
    tabs.value = tabs.value.map(tab =>
      tab.id === id ? { ...tab, loading, error: loading ? null : tab.error } : tab,
    )
  }

  function setActiveTabError(error: string | null) {
    const id = activeTabId.value
    if (!id) return
    tabs.value = tabs.value.map(tab =>
      tab.id === id
        ? { ...tab, error, ...(error != null ? { loading: false } : {}) }
        : tab,
    )
  }

  function patchTabById(
    tabId: string,
    partial: {
      loading?: boolean
      error?: string | null
      response?: ComposeResponse | null
      lastHistoryEntryId?: string
    },
  ) {
    tabs.value = tabs.value.map((tab) => {
      if (tab.id !== tabId) return tab
      const next = { ...tab }
      if (partial.loading !== undefined) {
        next.loading = partial.loading
        if (partial.loading) next.error = null
      }
      if (partial.error !== undefined) {
        next.error = partial.error
        if (partial.error != null) next.loading = false
      }
      if (partial.response !== undefined) {
        next.response = partial.response
      }
      if (partial.lastHistoryEntryId !== undefined) {
        next.lastHistoryEntryId = partial.lastHistoryEntryId
      }
      return next
    })
  }

  function patchActiveTab(partial: {
    loading?: boolean
    error?: string | null
    response?: ComposeResponse | null
  }) {
    const id = activeTabId.value
    if (!id) return
    patchTabById(id, partial)
  }

  function setActiveRequestTab(tab: ApiStudioOpenTab['activeRequestTab']) {
    const id = activeTabId.value
    if (!id || !tab) return
    tabs.value = tabs.value.map(item =>
      item.id === id ? { ...item, activeRequestTab: tab } : item,
    )
  }

  function initTabs(initial: ApiStudioOpenTab[]) {
    tabs.value = initial.map(tab => ({
      ...tab,
      draft: cloneDraft(tab.draft),
      response: tab.response ? { ...tab.response } : null,
    }))
    activeTabId.value = initial[0]?.id
  }

  function openUntitledTab() {
    const id = `tab-untitled-${Date.now()}`
    const tab: ApiStudioOpenTab = {
      id,
      requestNodeId: '',
      title: 'Untitled',
      method: 'GET',
      draft: createEmptyApiDraft(),
      response: null,
      loading: false,
      error: null,
      activeRequestTab: 'params',
      dirty: true,
    }
    tabs.value = [...tabs.value, tab]
    activeTabId.value = id
    return tab
  }

  return {
    tabs,
    activeTabId,
    activeTab,
    openTabForNode,
    openTabFromHistory,
    bindTabToRequest,
    reorderTabs,
    closeTab,
    closeTabsForRequestNodes,
    updateActiveTabDraft,
    clearTabDirty,
    updateActiveTabResponse,
    setActiveTabLoading,
    setActiveTabError,
    patchActiveTab,
    patchTabById,
    setActiveRequestTab,
    initTabs,
    openUntitledTab,
    syncRequestTabTitle,
    setDraftForNode,
  }
}
