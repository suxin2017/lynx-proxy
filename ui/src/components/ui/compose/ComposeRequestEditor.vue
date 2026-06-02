<script setup lang="ts">
import type { ComposeDraft, ComposeRequestTab } from './types'

import { computed } from 'vue'

import { composeGhostButtonSmClass, composeTabActiveClass, composeTabClass } from './compose-styles'
import ComposeBodyEditor from './ComposeBodyEditor.vue'
import KeyValueTable from './KeyValueTable.vue'
import { validateJsonDocument } from '@/components/ui/json-editor/utils'
import { composeGhostButtonClass } from './compose-styles'
import { syncDraftParamsToUrl } from './lib/parse-url-params'

const props = defineProps<{
  draft: ComposeDraft
  activeTab: ComposeRequestTab
}>()

const emit = defineEmits<{
  'update:draft': [draft: ComposeDraft]
  'update:activeTab': [tab: ComposeRequestTab]
}>()

const REQUEST_TABS: ComposeRequestTab[] = ['params', 'headers', 'body']

const TAB_LABELS: Record<ComposeRequestTab, string> = {
  params: 'Params',
  headers: 'Headers',
  body: 'Body',
}

const enabledParamCount = computed(() =>
  props.draft.queryParams.filter(row => row.enabled && row.key).length,
)

const enabledHeaderCount = computed(() =>
  props.draft.headers.filter(row => row.enabled && row.key).length,
)

const contentType = computed(() => {
  const row = props.draft.headers.find(
    header => header.enabled && header.key.toLowerCase() === 'content-type',
  )
  return row?.value?.toLowerCase() ?? ''
})

const canFormatBodyJson = computed(() =>
  props.activeTab === 'body' && contentType.value.includes('application/json'),
)

const canAddRow = computed(() => props.activeTab === 'params' || props.activeTab === 'headers')

function tabBadge(tab: ComposeRequestTab): string | null {
  if (tab === 'params' && enabledParamCount.value > 0) {
    return String(enabledParamCount.value)
  }
  if (tab === 'headers' && enabledHeaderCount.value > 0) {
    return String(enabledHeaderCount.value)
  }
  return null
}

function updateDraft(partial: Partial<ComposeDraft>) {
  emit('update:draft', { ...props.draft, ...partial })
}

function onQueryParamsChange(queryParams: ComposeDraft['queryParams']) {
  const next = syncDraftParamsToUrl({ ...props.draft, queryParams })
  emit('update:draft', next)
}

function onFormatBodyJson() {
  const result = validateJsonDocument(props.draft.body)
  if (result.formattedValue) {
    updateDraft({ body: result.formattedValue })
  }
}

function onAddRow() {
  if (props.activeTab === 'params') {
    const nextRows = [...props.draft.queryParams, { key: '', value: '', enabled: true }]
    onQueryParamsChange(nextRows)
    return
  }

  if (props.activeTab === 'headers') {
    const nextRows = [...props.draft.headers, { key: '', value: '', enabled: true }]
    updateDraft({ headers: nextRows })
  }
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <nav class="flex items-center justify-between gap-2 px-2 pt-1 pb-1.5">
      <div class="flex flex-wrap items-center gap-0.5">
        <button
          v-for="tab in REQUEST_TABS"
          :key="tab"
          type="button"
          :class="[composeTabClass, props.activeTab === tab ? composeTabActiveClass : 'hover:bg-muted/30']"
          @click="emit('update:activeTab', tab)"
        >
          {{ TAB_LABELS[tab] }}
          <span v-if="tabBadge(tab)" class="ml-1 text-[9px] text-muted-foreground">({{ tabBadge(tab) }})</span>
        </button>
      </div>

      <div class="flex shrink-0 items-center gap-0.5">
        <button
          v-if="canAddRow"
          type="button"
          :class="composeGhostButtonSmClass"
          title="添加"
          @click="onAddRow"
        >
          + 添加
        </button>
        <button
          v-if="canFormatBodyJson"
          type="button"
          :class="composeGhostButtonClass"
          title="格式化 JSON"
          @click="onFormatBodyJson"
        >
          格式化 JSON
        </button>
      </div>
    </nav>

    <div class="min-h-0 flex-1 overflow-hidden px-2 pb-2">
      <KeyValueTable
        v-if="props.activeTab === 'params'"
        :rows="props.draft.queryParams"
        key-placeholder="Query key"
        value-placeholder="Query value"
        @update:rows="onQueryParamsChange"
      />

      <KeyValueTable
        v-else-if="props.activeTab === 'headers'"
        :rows="props.draft.headers"
        key-placeholder="Header name"
        value-placeholder="Header value"
        @update:rows="updateDraft({ headers: $event })"
      />

      <ComposeBodyEditor
        v-else
        :body="props.draft.body"
        :headers="props.draft.headers"
        @update:body="updateDraft({ body: $event })"
      />
    </div>
  </div>
</template>
