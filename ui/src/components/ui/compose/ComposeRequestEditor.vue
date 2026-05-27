<script setup lang="ts">
import type { ComposeDraft, ComposeRequestTab } from './types'

import { computed } from 'vue'

import { composeTabActiveClass, composeTabClass } from './compose-styles'
import ComposeBodyEditor from './ComposeBodyEditor.vue'
import KeyValueTable from './KeyValueTable.vue'
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
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <nav class="flex flex-wrap items-center gap-0.5 px-2 pt-1 pb-1.5">
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
    </nav>

    <div class="min-h-0 flex-1 overflow-hidden px-2 pb-2">
      <KeyValueTable
        v-if="props.activeTab === 'params'"
        :rows="props.draft.queryParams"
        key-placeholder="Query key"
        value-placeholder="Query value"
        @update:rows="onQueryParamsChange"
      >
        <template #title>
          Query Params
        </template>
      </KeyValueTable>

      <KeyValueTable
        v-else-if="props.activeTab === 'headers'"
        :rows="props.draft.headers"
        key-placeholder="Header name"
        value-placeholder="Header value"
        @update:rows="updateDraft({ headers: $event })"
      >
        <template #title>
          Headers
        </template>
      </KeyValueTable>

      <ComposeBodyEditor
        v-else
        :body="props.draft.body"
        :headers="props.draft.headers"
        @update:body="updateDraft({ body: $event })"
      />
    </div>
  </div>
</template>
