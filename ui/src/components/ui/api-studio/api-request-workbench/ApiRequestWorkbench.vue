<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { ApiRequestDraft, ApiRequestLayout, ApiRequestTab, ComposeResponse } from '../types'
import { computed, onBeforeUnmount, ref } from 'vue'
import { HorizontalSplitPanel, VerticalSplitPanel } from '@/components/ui/split-panels'
import ComposeResponsePanel from '@/components/ui/compose/ComposeResponsePanel.vue'
import { exportDraftToCurl } from '@/components/ui/compose/lib/export-curl'
import { syncDraftUrlToParams } from '@/components/ui/compose/lib/parse-url-params'
import { cn } from '@/lib/utils'
import { apiStudioPanelPadXClass, apiStudioSectionTitleClass } from '../api-studio-styles'
import ApiRequestBar from './ApiRequestBar.vue'
import ApiRequestEditor from './ApiRequestEditor.vue'
import ApiResponseSummary from './ApiResponseSummary.vue'

const props = withDefaults(defineProps<{
  draft: ApiRequestDraft
  response?: ComposeResponse | null
  loading?: boolean
  error?: string | null
  layout?: ApiRequestLayout
  activeRequestTab?: ApiRequestTab
  embedded?: boolean
  class?: HTMLAttributes['class']
}>(), {
  response: null,
  loading: false,
  error: null,
  embedded: false,
})

const emit = defineEmits<{
  'update:draft': [draft: ApiRequestDraft]
  'update:layout': [layout: ApiRequestLayout]
  'update:activeRequestTab': [tab: ApiRequestTab]
  send: [draft: ApiRequestDraft]
  'export-curl': [curl: string]
}>()

const splitRatio = ref(48)
const localLayout = ref<ApiRequestLayout>('vertical')
const localActiveRequestTab = ref<ApiRequestTab>('params')
const hint = ref<string | null>(null)
let hintTimer: ReturnType<typeof setTimeout> | null = null

const layoutValue = computed(() => props.layout ?? localLayout.value)
const activeRequestTabValue = computed(() => props.activeRequestTab ?? localActiveRequestTab.value)

function updateDraft(draft: ApiRequestDraft) {
  emit('update:draft', draft)
}

function onUrlChange(url: string) {
  updateDraft(syncDraftUrlToParams(props.draft, url) as ApiRequestDraft)
}

function onSend() {
  emit('send', props.draft)
}

function toggleLayout() {
  const next = layoutValue.value === 'vertical' ? 'horizontal' : 'vertical'
  if (props.layout === undefined) {
    localLayout.value = next
  }
  emit('update:layout', next)
}

function setActiveRequestTab(tab: ApiRequestTab) {
  if (props.activeRequestTab === undefined) {
    localActiveRequestTab.value = tab
  }
  emit('update:activeRequestTab', tab)
}

function setHint(text: string) {
  hint.value = text
  if (hintTimer) clearTimeout(hintTimer)
  hintTimer = setTimeout(() => {
    hint.value = null
    hintTimer = null
  }, 1600)
}

async function copyCurl() {
  const curl = exportDraftToCurl(props.draft)
  emit('export-curl', curl)

  if (!curl.trim()) {
    setHint('复制失败')
    return
  }

  try {
    if (!globalThis.navigator?.clipboard?.writeText) {
      throw new Error('Clipboard API is unavailable')
    }
    await globalThis.navigator.clipboard.writeText(curl)
    setHint('已复制 cURL')
  } catch {
    setHint('复制失败')
  }
}

onBeforeUnmount(() => {
  if (hintTimer) clearTimeout(hintTimer)
})

const editorProps = computed(() => ({
  draft: props.draft,
  activeTab: activeRequestTabValue.value,
  compact: props.embedded,
  layout: layoutValue.value,
  canCopyCurl: Boolean(props.draft.url.trim()),
}))
</script>

<template>
  <section
    :class="cn(
      'flex h-full min-h-0 flex-col overflow-hidden',
      !props.embedded && 'min-h-[32rem] rounded-lg border border-border bg-card',
      props.class,
    )"
  >
    <div
      v-if="!props.embedded"
      class="flex items-center justify-between gap-3 px-3 pb-1 pt-2.5"
    >
      <div class="min-w-0">
        <h2 :class="apiStudioSectionTitleClass">
          API Studio
        </h2>
        <p
          v-if="props.draft.name"
          class="truncate text-xs text-muted-foreground"
        >
          {{ props.draft.name }}
        </p>
      </div>
    </div>

    <ApiRequestBar
      class="shrink-0"
      :draft="props.draft"
      :loading="props.loading"
      :compact="props.embedded"
      show-send
      @update:method="updateDraft({ ...props.draft, method: $event })"
      @update:url="onUrlChange"
      @send="onSend"
    />

    <div :class="['min-h-0 flex-1 overflow-hidden pb-1', props.embedded ? 'pl-0 pr-1' : 'px-1']">
      <VerticalSplitPanel
        v-if="layoutValue === 'vertical'"
        v-model="splitRatio"
        class="h-full min-h-0"
        :min-top-px="props.embedded ? 100 : 200"
        :min-bottom-px="props.embedded ? 100 : 200"
      >
        <template #top>
          <ApiRequestEditor
            v-bind="editorProps"
            class="h-full"
            @update:draft="updateDraft"
            @update:active-tab="setActiveRequestTab"
            @copy-curl="copyCurl"
            @toggle-layout="toggleLayout"
          />
        </template>
        <template #bottom>
          <ComposeResponsePanel
            :response="props.response"
            :loading="props.loading"
            :error="props.error"
            hide-status-bar
            :class="apiStudioPanelPadXClass"
          >
            <template #tab-trailing>
              <ApiResponseSummary
                :response="props.response"
                :loading="props.loading"
                :error="props.error"
              />
            </template>
          </ComposeResponsePanel>
        </template>
      </VerticalSplitPanel>

      <HorizontalSplitPanel
        v-else
        v-model="splitRatio"
        class="h-full min-h-0"
        :min-left-px="props.embedded ? 200 : 280"
        :min-right-px="props.embedded ? 240 : 320"
      >
        <template #left>
          <ApiRequestEditor
            v-bind="editorProps"
            class="h-full"
            @update:draft="updateDraft"
            @update:active-tab="setActiveRequestTab"
            @copy-curl="copyCurl"
            @toggle-layout="toggleLayout"
          />
        </template>
        <template #right>
          <ComposeResponsePanel
            :response="props.response"
            :loading="props.loading"
            :error="props.error"
            hide-status-bar
            :class="apiStudioPanelPadXClass"
          >
            <template #tab-trailing>
              <ApiResponseSummary
                :response="props.response"
                :loading="props.loading"
                :error="props.error"
              />
            </template>
          </ComposeResponsePanel>
        </template>
      </HorizontalSplitPanel>
    </div>

    <div
      v-if="hint"
      :class="cn(
        'pointer-events-none fixed bottom-4 left-4 z-[60] rounded-sm border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm',
      )"
    >
      {{ hint }}
    </div>
  </section>
</template>
