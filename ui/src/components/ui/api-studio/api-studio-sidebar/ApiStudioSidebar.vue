<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { ref } from 'vue'
import type {
  ApiRequestHistoryEntry,
  ApiStudioSidebarView,
  CollectionCreateKind,
  CollectionNode,
  CollectionTreeAction,
} from '../types'
import { cn } from '@/lib/utils'
import { CurlImportDialog } from '@/components/ui/compose'
import { mergeCurlIntoDraft, parseCurlCommand } from '@/components/ui/compose/lib/parse-curl'
import { DEFAULT_API_REQUEST_SETTINGS } from '../lib/empty-api-draft'
import { apiStudioIconButtonClass, apiStudioSidebarScrollClass } from '../api-studio-styles'
import { createEmptyApiDraft } from '../lib/empty-api-draft'
import { CollectionTree } from '../collection-tree'
import { Trash2 } from '@lucide/vue'
import ApiRequestHistoryPanel from './ApiRequestHistoryPanel.vue'
import ApiStudioSidebarTabs from './ApiStudioSidebarTabs.vue'

const props = withDefaults(defineProps<{
  nodes: CollectionNode[]
  historyEntries: ApiRequestHistoryEntry[]
  selectedHistoryId?: string
  sidebarView?: ApiStudioSidebarView
  class?: HTMLAttributes['class']
}>(), {
  sidebarView: 'collections',
})

const selectedId = defineModel<string | undefined>('selectedId')
const sidebarView = defineModel<ApiStudioSidebarView>('sidebarView', { default: 'collections' })

const emit = defineEmits<{
  'collection-select': [node: CollectionNode]
  create: [kind: CollectionCreateKind]
  'tree-action': [action: CollectionTreeAction, node: CollectionNode]
  'node-rename': [node: CollectionNode, name: string]
  'move-node': [payload: import('../types').CollectionMovePayload]
  'import-curl': [draft: ReturnType<typeof createEmptyApiDraft>]
  'history-select': [entry: ApiRequestHistoryEntry]
  'history-remove': [id: string]
  'history-clear': []
  'tab-drop': [payload: { tabId: string; parentId: string }]
}>()

const curlDialogOpen = ref(false)
const curlError = ref<string | null>(null)

function onImportCurlClick() {
  curlError.value = null
  curlDialogOpen.value = true
}

function onCurlConfirm(curlText: string) {
  try {
    const base = createEmptyApiDraft()
    const parsed = parseCurlCommand(curlText)
    const merged = mergeCurlIntoDraft(base, curlText)
    const draft = createEmptyApiDraft({
      name: merged.name,
      method: merged.method,
      url: merged.url,
      queryParams: merged.queryParams,
      headers: merged.headers,
      body: merged.body,
      timeout: merged.timeout,
      settings: {
        ...DEFAULT_API_REQUEST_SETTINGS,
        followRedirects: parsed.followRedirects ?? true,
      },
    })
    curlDialogOpen.value = false
    curlError.value = null
    sidebarView.value = 'collections'
    emit('import-curl', draft)
  }
  catch (err) {
    curlError.value = err instanceof Error ? err.message : '无法解析 cURL'
  }
}
</script>

<template>
  <aside
    :class="cn('flex min-h-0 flex-col overflow-hidden bg-card', props.class)"
  >
    <div :class="apiStudioSidebarScrollClass">
      <CollectionTree
        v-show="sidebarView === 'collections'"
        :nodes="props.nodes"
        v-model:selected-id="selectedId"
        :contain-scroll="false"
        class="!rounded-none !border-0"
        :show-import-curl="true"
        @node-select="emit('collection-select', $event)"
        @create="emit('create', $event)"
        @tree-action="(action, node) => emit('tree-action', action, node)"
        @node-rename="(node, name) => emit('node-rename', node, name)"
        @move-node="emit('move-node', $event)"
        @import-curl-click="onImportCurlClick"
        @tab-drop="emit('tab-drop', $event)"
      />

      <ApiRequestHistoryPanel
        v-show="sidebarView === 'history'"
        :entries="props.historyEntries"
        :selected-id="props.selectedHistoryId"
        @select="emit('history-select', $event)"
        @remove="emit('history-remove', $event)"
      />
    </div>

    <div class="flex shrink-0 items-center justify-end gap-0.5 border-t border-border/60 px-2 py-1">
      <button
        v-if="sidebarView === 'history' && props.historyEntries.length > 0"
        type="button"
        :class="[apiStudioIconButtonClass, '!size-6']"
        title="清空历史"
        aria-label="清空历史"
        @click="emit('history-clear')"
      >
        <Trash2 class="size-3" />
      </button>
      <ApiStudioSidebarTabs v-model:view="sidebarView" class="!border-0 !px-0 !py-0" />
    </div>

    <CurlImportDialog
      v-model:open="curlDialogOpen"
      :error="curlError"
      @confirm="onCurlConfirm"
      @cancel="curlError = null"
    />
  </aside>
</template>
