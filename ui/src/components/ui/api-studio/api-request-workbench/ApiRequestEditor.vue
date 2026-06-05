<script setup lang="ts">
import type { ApiRequestDraft, ApiRequestLayout, ApiRequestTab } from '../types'
import { computed } from 'vue'
import { ClipboardCopy, Columns2, FileJson, Plus, Rows2 } from '@lucide/vue'
import KeyValueTable from '@/components/ui/compose/KeyValueTable.vue'
import ComposeBodyEditor from '@/components/ui/compose/ComposeBodyEditor.vue'
import { syncDraftParamsToUrl } from '@/components/ui/compose/lib/parse-url-params'
import { validateJsonDocument } from '@/components/ui/json-editor/utils'
import {
  apiStudioIconButtonClass,
  apiStudioPanelPadXClass,
  apiStudioToolbarDividerClass,
  apiStudioUnderlineTabActiveClass,
  apiStudioUnderlineTabClass,
  apiStudioUnderlineTabIdleClass,
  apiStudioUnderlineTabListClass,
} from '../api-studio-styles'
import ApiRequestCookiesPanel from './ApiRequestCookiesPanel.vue'
import ApiRequestSettingsPanel from './ApiRequestSettingsPanel.vue'

const props = withDefaults(defineProps<{
  draft: ApiRequestDraft
  activeTab: ApiRequestTab
  compact?: boolean
  layout?: ApiRequestLayout
  canCopyCurl?: boolean
}>(), {
  compact: false,
  layout: 'vertical',
  canCopyCurl: true,
})

const emit = defineEmits<{
  'update:draft': [draft: ApiRequestDraft]
  'update:activeTab': [tab: ApiRequestTab]
  'copy-curl': []
  'toggle-layout': []
}>()

const REQUEST_TABS: ApiRequestTab[] = ['params', 'headers', 'body', 'cookies', 'settings']

const TAB_LABELS: Record<ApiRequestTab, string> = {
  params: 'Params',
  headers: 'Headers',
  body: 'Body',
  cookies: 'Cookies',
  settings: 'Settings',
}

const enabledParamCount = computed(() =>
  props.draft.queryParams.filter(row => row.enabled && row.key).length,
)

const enabledHeaderCount = computed(() =>
  props.draft.headers.filter(row => row.enabled && row.key).length,
)

const enabledCookieCount = computed(() =>
  props.draft.cookies.filter(row => row.enabled && row.key).length,
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

const canAddRow = computed(() =>
  props.activeTab === 'params'
  || props.activeTab === 'headers'
  || props.activeTab === 'cookies',
)

function tabBadge(tab: ApiRequestTab): string | null {
  if (tab === 'params' && enabledParamCount.value > 0) {
    return String(enabledParamCount.value)
  }
  if (tab === 'headers' && enabledHeaderCount.value > 0) {
    return String(enabledHeaderCount.value)
  }
  if (tab === 'cookies' && enabledCookieCount.value > 0) {
    return String(enabledCookieCount.value)
  }
  return null
}

function updateDraft(partial: Partial<ApiRequestDraft>) {
  emit('update:draft', { ...props.draft, ...partial })
}

function onQueryParamsChange(queryParams: ApiRequestDraft['queryParams']) {
  const next = syncDraftParamsToUrl({ ...props.draft, queryParams })
  emit('update:draft', next as ApiRequestDraft)
}

function onFormatBodyJson() {
  const result = validateJsonDocument(props.draft.body)
  if (result.formattedValue) {
    updateDraft({ body: result.formattedValue })
  }
}

function onAddRow() {
  if (props.activeTab === 'params') {
    onQueryParamsChange([...props.draft.queryParams, { key: '', value: '', enabled: true }])
    return
  }
  if (props.activeTab === 'headers') {
    updateDraft({ headers: [...props.draft.headers, { key: '', value: '', enabled: true }] })
    return
  }
  if (props.activeTab === 'cookies') {
    updateDraft({ cookies: [...props.draft.cookies, { key: '', value: '', enabled: true }] })
  }
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden">
    <nav
      :class="[
        'flex shrink-0 items-end gap-2 overflow-hidden border-b border-border/60',
        apiStudioPanelPadXClass,
        props.compact ? 'py-1' : 'py-1.5',
      ]"
    >
      <div
        role="tablist"
        aria-label="请求配置"
        :class="[apiStudioUnderlineTabListClass, 'scrollbar-none']"
      >
        <button
          v-for="tab in REQUEST_TABS"
          :key="tab"
          type="button"
          role="tab"
          :aria-selected="props.activeTab === tab"
          :class="[
            apiStudioUnderlineTabClass,
            props.activeTab === tab ? apiStudioUnderlineTabActiveClass : apiStudioUnderlineTabIdleClass,
          ]"
          @click="emit('update:activeTab', tab)"
        >
          {{ TAB_LABELS[tab] }}
          <span v-if="tabBadge(tab)" class="ml-1.5 text-[9px] text-muted-foreground">({{ tabBadge(tab) }})</span>
        </button>
      </div>

      <div class="mb-0.5 flex shrink-0 items-center gap-0.5">
        <button
          v-if="props.canCopyCurl"
          type="button"
          :class="apiStudioIconButtonClass"
          title="复制 cURL"
          aria-label="复制 cURL"
          @click="emit('copy-curl')"
        >
          <ClipboardCopy class="size-3.5" />
        </button>
        <button
          type="button"
          :class="apiStudioIconButtonClass"
          :title="props.layout === 'vertical' ? '切换为左右布局' : '切换为上下布局'"
          :aria-label="props.layout === 'vertical' ? '切换为左右布局' : '切换为上下布局'"
          @click="emit('toggle-layout')"
        >
          <Rows2 v-if="props.layout === 'vertical'" class="size-3.5" />
          <Columns2 v-else class="size-3.5" />
        </button>

        <template v-if="canAddRow || canFormatBodyJson">
          <span :class="apiStudioToolbarDividerClass" />
          <button
            v-if="canAddRow"
            type="button"
            :class="apiStudioIconButtonClass"
            title="添加行"
            aria-label="添加行"
            @click="onAddRow"
          >
            <Plus class="size-3.5" />
          </button>
          <button
            v-if="canFormatBodyJson"
            type="button"
            :class="apiStudioIconButtonClass"
            title="格式化 JSON"
            aria-label="格式化 JSON"
            @click="onFormatBodyJson"
          >
            <FileJson class="size-3.5" />
          </button>
        </template>
      </div>
    </nav>

    <div
      :class="[
        'flex min-h-0 flex-1 flex-col overflow-hidden',
        apiStudioPanelPadXClass,
        props.compact ? 'pb-1.5 pt-1' : 'pb-2 pt-1.5',
      ]"
    >
      <KeyValueTable
        v-if="props.activeTab === 'params'"
        class="h-full min-h-0"
        :rows="props.draft.queryParams"
        key-placeholder="Query key"
        value-placeholder="Query value"
        @update:rows="onQueryParamsChange"
      />

      <KeyValueTable
        v-else-if="props.activeTab === 'headers'"
        class="h-full min-h-0"
        :rows="props.draft.headers"
        key-placeholder="Header name"
        value-placeholder="Header value"
        @update:rows="updateDraft({ headers: $event })"
      />

      <ComposeBodyEditor
        v-else-if="props.activeTab === 'body'"
        class="h-full min-h-0"
        :body="props.draft.body"
        :headers="props.draft.headers"
        @update:body="updateDraft({ body: $event })"
      />

      <ApiRequestCookiesPanel
        v-else-if="props.activeTab === 'cookies'"
        class="h-full min-h-0"
        :draft="props.draft"
        @update:draft="emit('update:draft', $event)"
      />

      <ApiRequestSettingsPanel
        v-else
        class="h-full min-h-0"
        :draft="props.draft"
        @update:draft="emit('update:draft', $event)"
      />
    </div>
  </div>
</template>
