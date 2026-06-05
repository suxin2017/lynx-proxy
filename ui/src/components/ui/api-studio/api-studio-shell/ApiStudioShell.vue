<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed, nextTick, onMounted, ref, toRef, watch } from 'vue'
import type {
  ApiRequestDraft,
  ApiRequestHistoryEntry,
  ApiRequestLayout,
  ApiRequestTab,
  ApiStudioOpenTab,
  ApiStudioSidebarView,
  CollectionCreateKind,
  CollectionMovePayload,
  CollectionNode,
  CollectionTreeAction,
  ComposeResponse,
} from '../types'
import { HorizontalSplitPanel } from '@/components/ui/split-panels'
import { cn } from '@/lib/utils'
import { ApiStudioSidebar, useApiRequestHistory } from '../api-studio-sidebar'
import { useCollectionMutations } from '../collection-tree/useCollectionMutations'
import { ApiRequestWorkbench } from '../api-request-workbench'
import ApiStudioTabBar from './ApiStudioTabBar.vue'
import { cloneDraft } from '../lib/clone-draft'
import {
  findLatestHistoryEntryForTab,
  normalizeHistoryEntry,
  responseFromHistoryEntry,
} from '../lib/history-response'
import { isRequestNode } from '../lib/is-request-node'
import { useApiStudioTabs } from './useApiStudioTabs'
import { useApiStudioTabSession } from './useApiStudioTabSession'

const props = withDefaults(defineProps<{
  nodes?: CollectionNode[]
  drafts?: Record<string, ApiRequestDraft>
  initialTabs?: ApiStudioOpenTab[]
  initialActiveTabId?: string
  /** When true, collection + drafts are loaded and tab session may restore. */
  hydrated?: boolean
  /** Persist open tabs / selection to localStorage (off in Storybook). */
  persistTabSession?: boolean
  layout?: ApiRequestLayout
  treeWidth?: number
  class?: HTMLAttributes['class']
}>(), {
  nodes: undefined,
  drafts: undefined,
  initialTabs: undefined,
  initialActiveTabId: undefined,
  hydrated: false,
  persistTabSession: true,
  treeWidth: 30,
})

const nodes = defineModel<CollectionNode[]>('nodes', {
  default: () => [],
})

const draftsState = ref<Record<string, ApiRequestDraft>>({ ...(props.drafts ?? {}) })

watch(() => props.drafts, (next) => {
  if (next) {
    draftsState.value = { ...next }
  }
}, { deep: true, immediate: true })

const selectedId = defineModel<string | undefined>('selectedId')
const sidebarView = ref<ApiStudioSidebarView>('collections')
const selectedHistoryId = ref<string | undefined>(undefined)

/** Draft actually sent (workbench draft can differ from tab draft until synced). */
const pendingSentDraft = ref<ApiRequestDraft | null>(null)

type InflightSendTarget =
  | { kind: 'history' }
  | { kind: 'tab'; tabId: string }

const inflightSend = ref<InflightSendTarget | null>(null)

const historyPreview = ref<{
  entry: ApiRequestHistoryEntry
  draft: ApiRequestDraft
  response: ComposeResponse | null
  loading: boolean
  error: string | null
} | null>(null)

const isHistoryPreview = computed(() => historyPreview.value != null)

const workbenchDraft = computed((): ApiRequestDraft | undefined =>
  historyPreview.value?.draft ?? activeTab.value?.draft,
)

const workbenchResponse = computed(
  () => historyPreview.value?.response ?? activeTab.value?.response ?? null,
)

const workbenchLoading = computed(() => {
  if (isHistoryPreview.value) {
    return historyPreview.value?.loading ?? false
  }
  return activeTab.value?.loading ?? false
})

const workbenchError = computed(() => {
  const response = workbenchResponse.value
  // Prefer the response panel whenever we have a completed HTTP status to show.
  if (response != null && response.status > 0) {
    return null
  }
  if (isHistoryPreview.value) {
    const preview = historyPreview.value
    if (!preview) return null
    return preview.error ?? preview.response?.errorMessage ?? null
  }
  const tab = activeTab.value
  return tab?.error ?? tab?.response?.errorMessage ?? null
})

function clearHistoryPreview() {
  historyPreview.value = null
  selectedHistoryId.value = undefined
}

function showHistoryPreview(entry: ApiRequestHistoryEntry) {
  const latest = historyEntries.value.find(item => item.id === entry.id) ?? entry
  const normalized = normalizeHistoryEntry(latest)
  selectedHistoryId.value = normalized.id
  historyPreview.value = {
    entry: normalized,
    draft: cloneDraft(normalized.draft),
    response: responseFromHistoryEntry(normalized),
    loading: false,
    error: null,
  }
}

const emit = defineEmits<{
  'update:layout': [layout: ApiRequestLayout]
  'update:drafts': [drafts: Record<string, ApiRequestDraft>]
  send: [draft: ApiRequestDraft, tabId: string, requestNodeId: string | undefined]
  'tab-open': [tab: ApiStudioOpenTab]
  'tab-close': [tabId: string]
}>()

const splitRatio = ref(props.treeWidth)

const {
  entries: historyEntries,
  loading: historyLoading,
  pushHistory,
  removeEntry,
  clearAll: clearHistory,
} = useApiRequestHistory()

const {
  create,
  move,
  handleTreeAction,
  renameNode,
  createRequestFromDraft,
} = useCollectionMutations(nodes)

const {
  tabs,
  activeTabId,
  activeTab,
  openTabForNode,
  syncRequestTabTitle,
  bindTabToRequest,
  closeTab,
  closeTabsForRequestNodes,
  updateActiveTabDraft,
  patchActiveTab,
  patchTabById,
  setActiveRequestTab,
  initTabs,
  setDraftForNode,
  clearTabDirty,
} = useApiStudioTabs(nodes, {
  drafts: draftsState,
  onDraftsChange: (next) => {
    draftsState.value = next
    emit('update:drafts', next)
  },
})

const sessionEnabled = computed(
  () => props.persistTabSession !== false && !props.initialTabs?.length,
)

function restoreTabResponsesFromHistory() {
  if (isRestoringSession.value) return
  for (const tab of tabs.value) {
    if (tab.response?.body?.trim()) continue
    const entry = findLatestHistoryEntryForTab(tab, historyEntries.value)
    if (!entry) continue
    const response = responseFromHistoryEntry(entry)
    if (!response || (response.status <= 0 && !response.body?.trim())) continue
    patchTabById(tab.id, {
      response,
      loading: false,
      error: response.errorMessage ?? null,
      lastHistoryEntryId: entry.id,
    })
  }
}

const { isRestoring: isRestoringSession, restored: sessionRestored, flushPersist: flushTabSession } = useApiStudioTabSession({
  enabled: sessionEnabled,
  hydrated: toRef(props, 'hydrated'),
  historyLoading,
  tabs,
  activeTabId,
  selectedId,
  sidebarView,
  nodes,
  historyEntries,
  openTabForNode,
  selectedHistoryId,
  onRestoreHistoryPreview: showHistoryPreview,
  onRestoreTabSessionRef: (tabId, ref) => {
    patchTabById(tabId, {
      ...(ref.lastHistoryEntryId ? { lastHistoryEntryId: ref.lastHistoryEntryId } : {}),
      ...(ref.lastResponse
        ? {
            response: ref.lastResponse,
            loading: false,
            error: ref.lastResponse.errorMessage ?? null,
          }
        : {}),
    })
  },
})

watch(
  () => [sessionRestored.value, historyLoading.value, historyEntries.value.length] as const,
  () => {
    if (!sessionRestored.value || historyLoading.value) return
    restoreTabResponsesFromHistory()
  },
)

onMounted(() => {
  if (props.nodes?.length && nodes.value.length === 0) {
    nodes.value = [...props.nodes]
  }
  if (props.initialTabs?.length) {
    initTabs(props.initialTabs)
    activeTabId.value = props.initialActiveTabId ?? props.initialTabs[0]?.id
    const first = props.initialTabs.find(t => t.id === activeTabId.value)
    if (first?.requestNodeId) {
      selectedId.value = first.requestNodeId
    }
  }
})

function ensureNodeInList(node: CollectionNode) {
  if (!nodes.value.some(item => item.id === node.id)) {
    nodes.value = [...nodes.value, node]
  }
}

async function openTabForRequestNode(
  requestNodeId: string,
  nodeHint?: CollectionNode,
  draftOverride?: ApiRequestDraft,
) {
  await nextTick()
  const node = nodeHint ?? nodes.value.find(item => item.id === requestNodeId)
  if (!node || !isRequestNode(node)) return

  const tab = openTabForNode(requestNodeId, draftOverride, node)
  if (tab) emit('tab-open', tab)
}

watch(selectedId, (id) => {
  if (isRestoringSession.value || !id) return
  void openTabForRequestNode(id)
})

function onCollectionNodeSelect(node: CollectionNode) {
  clearHistoryPreview()
  ensureNodeInList(node)
  selectedId.value = node.id
  if (!isRequestNode(node)) return
  void openTabForRequestNode(node.id, node)
}

function onTabSelect(id: string) {
  clearHistoryPreview()
  activeTabId.value = id
  const tab = tabs.value.find(item => item.id === id)
  if (tab?.requestNodeId) {
    selectedId.value = tab.requestNodeId
  }
}

function onWorkbenchDraftUpdate(draft: ApiRequestDraft) {
  if (historyPreview.value) {
    historyPreview.value.draft = cloneDraft(draft)
    return
  }
  updateActiveTabDraft(draft)
}

function onActiveRequestTabChange(tab: ApiRequestTab) {
  if (historyPreview.value) return
  setActiveRequestTab(tab)
}

function onTabClose(tabId: string) {
  closeTab(tabId)
  emit('tab-close', tabId)

  const stillActive = tabs.value.find(tab => tab.id === activeTabId.value)
  if (stillActive?.requestNodeId) {
    selectedId.value = stillActive.requestNodeId
  } else if (tabs.value.length === 0) {
    selectedId.value = undefined
  }
}

function onSend(draft: ApiRequestDraft) {
  pendingSentDraft.value = cloneDraft(draft)
  if (historyPreview.value) {
    inflightSend.value = { kind: 'history' }
    historyPreview.value.draft = cloneDraft(draft)
    emit(
      'send',
      draft,
      `history:${historyPreview.value.entry.id}`,
      historyPreview.value.entry.requestNodeId,
    )
    return
  }
  const tabId = activeTabId.value
  if (!tabId) return
  inflightSend.value = { kind: 'tab', tabId }
  emit('send', draft, tabId, activeTab.value?.requestNodeId || undefined)
}

function takePendingSentDraft(fallback: ApiRequestDraft): ApiRequestDraft {
  const sent = pendingSentDraft.value
  pendingSentDraft.value = null
  return sent ? cloneDraft(sent) : cloneDraft(fallback)
}

async function onSendComplete(response: ComposeResponse | null) {
  const target = inflightSend.value
  inflightSend.value = null

  if (target?.kind === 'history' && historyPreview.value) {
    const preview = historyPreview.value
    const entry = await pushHistory({
      draft: takePendingSentDraft(preview.draft),
      response,
      requestNodeId: preview.entry.requestNodeId,
      tabId: preview.entry.tabId,
    })
    if (entry) {
      selectedHistoryId.value = entry.id
      historyPreview.value = {
        ...preview,
        entry,
        draft: cloneDraft(entry.draft),
        response:
          preview.response
          ?? response
          ?? responseFromHistoryEntry(entry),
        loading: false,
        error: null,
      }
    }
    flushTabSession()
    return
  }

  const tabId = target?.kind === 'tab' ? target.tabId : activeTabId.value
  const tab = tabId ? tabs.value.find(item => item.id === tabId) : undefined
  if (!tab) {
    pendingSentDraft.value = null
    return
  }
  const entry = await pushHistory({
    draft: takePendingSentDraft(tab.draft),
    response,
    requestNodeId: tab.requestNodeId || undefined,
    tabId: tab.id,
  })
  if (entry) {
    patchTabById(tab.id, { lastHistoryEntryId: entry.id })
  }
  flushTabSession()
}

function applyActiveTabResult(partial: {
  response?: ComposeResponse | null
  loading?: boolean
  error?: string | null
}) {
  const target = inflightSend.value

  if (target?.kind === 'history' && historyPreview.value) {
    if (partial.response !== undefined) {
      historyPreview.value.response = partial.response
    }
    if (partial.loading !== undefined) {
      historyPreview.value.loading = partial.loading
    }
    if (partial.error !== undefined) {
      historyPreview.value.error = partial.error
    }
    if (partial.loading === false) {
      if (partial.response != null) {
        void onSendComplete(partial.response)
      }
      else {
        inflightSend.value = null
      }
    }
    return
  }

  if (target?.kind === 'tab') {
    patchTabById(target.tabId, partial)
    if (partial.loading === false) {
      if (partial.response != null) {
        void onSendComplete(partial.response)
      }
      else {
        inflightSend.value = null
        pendingSentDraft.value = null
      }
    }
    return
  }

  patchActiveTab(partial)
  if (partial.loading === false) {
    if (partial.response != null) {
      void onSendComplete(partial.response)
    }
    else {
      inflightSend.value = null
    }
  }
}

async function onCreate(kind: CollectionCreateKind) {
  const node = await create(kind, undefined, selectedId.value)
  if (!node) return
  ensureNodeInList(node)
  if (isRequestNode(node)) {
    await openTabForRequestNode(node.id, node)
  }
  else {
    selectedId.value = node.id
  }
}

async function onNodeRename(node: CollectionNode, name: string) {
  await renameNode(node.id, name)
  if (node.kind === 'request') {
    syncRequestTabTitle(node.id, name)
  }
}

async function onTreeAction(action: CollectionTreeAction, node: CollectionNode) {
  const result = await handleTreeAction(action, node, selectedId.value)
  if (action === 'delete' && result?.removedRequestNodeIds?.length) {
    closeTabsForRequestNodes(result.removedRequestNodeIds)
  }
  if (result?.clearedSelection) {
    selectedId.value = undefined
  }
  if (action === 'new-request' && node.kind !== 'request') {
    const created = nodes.value
      .filter(n => n.parentId === node.id && n.kind === 'request')
      .sort((a, b) => (b.order ?? 0) - (a.order ?? 0))[0]
    if (created) {
      ensureNodeInList(created)
      await openTabForRequestNode(created.id, created)
    }
  }
}

function onMoveNode(payload: CollectionMovePayload) {
  void move(payload)
}

async function onImportCurl(draft: ApiRequestDraft) {
  const node = await createRequestFromDraft(draft, undefined, selectedId.value)
  ensureNodeInList(node)
  if (node.draftId) {
    setDraftForNode(node.draftId, draft)
  }
  sidebarView.value = 'collections'
  await openTabForRequestNode(node.id, node, draft)
}

function onHistorySelect(entry: ApiRequestHistoryEntry) {
  showHistoryPreview(entry)
}

function onHistoryRemove(id: string) {
  if (selectedHistoryId.value === id) {
    clearHistoryPreview()
  }
  void removeEntry(id)
}

async function onTabDrop({ tabId, parentId }: { tabId: string; parentId: string }) {
  const tab = tabs.value.find(t => t.id === tabId)
  if (!tab) return

  if (tab.requestNodeId) {
    await move({ nodeId: tab.requestNodeId, newParentId: parentId })
    selectedId.value = tab.requestNodeId
    return
  }

  const node = await createRequestFromDraft(tab.draft, parentId, parentId)
  ensureNodeInList(node)
  if (node.draftId) {
    setDraftForNode(node.draftId, tab.draft)
  }
  bindTabToRequest(tabId, node, tab.draft)
  await openTabForRequestNode(node.id, node)
}

defineExpose({
  applyActiveTabResult,
  clearTabDirty,
  initTabs,
  openTabForNode,
  tabs,
  activeTabId,
  historyEntries,
  pushHistory,
})
</script>

<template>
  <div
    :class="cn('flex h-full min-h-[32rem] overflow-hidden rounded-lg border border-border bg-card', props.class)"
  >
    <HorizontalSplitPanel
      v-model="splitRatio"
      class="h-full w-full"
      :min-left-px="240"
      :min-right-px="400"
    >
      <template #left>
        <ApiStudioSidebar
          :nodes="nodes"
          :history-entries="historyEntries"
          :selected-history-id="selectedHistoryId"
          v-model:selected-id="selectedId"
          v-model:sidebar-view="sidebarView"
          class="h-full"
          @collection-select="onCollectionNodeSelect"
          @create="onCreate"
          @tree-action="onTreeAction"
          @node-rename="onNodeRename"
          @move-node="onMoveNode"
          @import-curl="onImportCurl"
          @history-select="onHistorySelect"
          @history-remove="onHistoryRemove"
          @history-clear="clearHistory"
          @tab-drop="onTabDrop"
        />
      </template>
      <template #right>
        <div class="flex h-full min-h-0 flex-col overflow-hidden">
          <ApiStudioTabBar
            :tabs="tabs"
            :active-tab-id="activeTabId"
            @update:active-tab-id="onTabSelect"
            @close="onTabClose"
          />

          <ApiRequestWorkbench
            v-if="workbenchDraft"
            :draft="workbenchDraft"
            :response="workbenchResponse"
            :loading="workbenchLoading"
            :error="workbenchError"
            :layout="props.layout"
            :active-request-tab="isHistoryPreview ? undefined : (activeTab?.activeRequestTab ?? 'params')"
            embedded
            class="min-h-0 flex-1 !rounded-none !border-0"
            @update:draft="onWorkbenchDraftUpdate"
            @update:layout="emit('update:layout', $event)"
            @update:active-request-tab="onActiveRequestTabChange"
            @send="onSend"
          />

          <div
            v-else
            class="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-xs text-muted-foreground"
          >
            <p>从左侧集合选择请求以打开标签页，或点击历史记录查看发送详情</p>
          </div>
        </div>
      </template>
    </HorizontalSplitPanel>
  </div>
</template>
