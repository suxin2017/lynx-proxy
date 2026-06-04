<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { ComposeDraft, ComposeLayout, ComposeRequestTab, ComposeResponse } from './types'

import { computed, onBeforeUnmount, ref } from 'vue'
import { Columns2, Rows2 } from '@lucide/vue'

import { HorizontalSplitPanel, VerticalSplitPanel } from '@/components/ui/split-panels'
import { cn } from '@/lib/utils'

import { composeGhostButtonClass, composeSectionTitleClass } from './compose-styles'
import ComposeRequestBar from './ComposeRequestBar.vue'
import ComposeRequestEditor from './ComposeRequestEditor.vue'
import ComposeResponsePanel from './ComposeResponsePanel.vue'
import { exportDraftToCurl } from './lib/export-curl'
import { syncDraftUrlToParams } from './lib/parse-url-params'

const props = withDefaults(defineProps<{
  draft: ComposeDraft
  response?: ComposeResponse | null
  loading?: boolean
  error?: string | null
  layout?: ComposeLayout
  activeRequestTab?: ComposeRequestTab
  /** Embed mode: no outer border/rounded/bg wrapper. */
  embedded?: boolean
  class?: HTMLAttributes['class']
}>(), {
  response: null,
  loading: false,
  error: null,
  embedded: false,
})

const emit = defineEmits<{
  'update:draft': [draft: ComposeDraft]
  'update:layout': [layout: ComposeLayout]
  'update:activeRequestTab': [tab: ComposeRequestTab]
  send: [draft: ComposeDraft]
  reset: []
  'import-curl': [draft: ComposeDraft]
  'export-curl': [curl: string]
}>()

const splitRatio = ref(48)
const localLayout = ref<ComposeLayout>('vertical')
const localActiveRequestTab = ref<ComposeRequestTab>('params')
const hint = ref<string | null>(null)
let hintTimer: ReturnType<typeof setTimeout> | null = null

const layoutValue = computed(() => props.layout ?? localLayout.value)
const activeRequestTabValue = computed(() => props.activeRequestTab ?? localActiveRequestTab.value)

function updateDraft(draft: ComposeDraft) {
  emit('update:draft', draft)
}

function onUrlChange(url: string) {
  updateDraft(syncDraftUrlToParams(props.draft, url))
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

function setActiveRequestTab(tab: ComposeRequestTab) {
  if (props.activeRequestTab === undefined) {
    localActiveRequestTab.value = tab
  }
  emit('update:activeRequestTab', tab)
}

function setHint(text: string) {
  hint.value = text
  if (hintTimer) {
    clearTimeout(hintTimer)
  }
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
  if (hintTimer) {
    clearTimeout(hintTimer)
  }
})
</script>

<template>
  <section
    :class="cn(
      'flex h-full min-h-[32rem] flex-col overflow-hidden',
      !props.embedded && 'rounded-lg border border-border bg-card',
      props.class,
    )"
  >
    <div
      v-if="!props.embedded"
      class="flex items-center justify-between gap-3 px-3 pb-1 pt-2.5"
    >
      <div class="min-w-0">
        <h2 :class="composeSectionTitleClass">
          Compose
        </h2>
      </div>

      <div class="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          :class="composeGhostButtonClass"
          :disabled="!props.draft.url.trim()"
          title="复制 cURL"
          @click="copyCurl"
        >
          复制 cURL
        </button>
        <button
          type="button"
          :class="composeGhostButtonClass"
          :title="layoutValue === 'vertical' ? '切换为左右布局' : '切换为上下布局'"
          @click="toggleLayout"
        >
          <Rows2 v-if="layoutValue === 'vertical'" class="size-3.5" />
          <Columns2 v-else class="size-3.5" />
        </button>
      </div>
    </div>

    <ComposeRequestBar
      :draft="props.draft"
      :loading="props.loading"
      :compact="props.embedded"
      @update:method="updateDraft({ ...props.draft, method: $event })"
      @update:url="onUrlChange"
      @send="onSend"
    >
      <template v-if="props.embedded" #trailing>
        <div class="ml-1 flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            :class="composeGhostButtonClass"
            :disabled="!props.draft.url.trim()"
            title="复制 cURL"
            @click="copyCurl"
          >
            复制 cURL
          </button>
          <button
            type="button"
            :class="composeGhostButtonClass"
            :title="layoutValue === 'vertical' ? '切换为左右布局' : '切换为上下布局'"
            @click="toggleLayout"
          >
            <Rows2 v-if="layoutValue === 'vertical'" class="size-3.5" />
            <Columns2 v-else class="size-3.5" />
          </button>
        </div>
      </template>
    </ComposeRequestBar>

    <div class="min-h-0 flex-1 px-1 pb-1">
      <VerticalSplitPanel
        v-if="layoutValue === 'vertical'"
        v-model="splitRatio"
        class="h-full"
        :min-top-px="200"
        :min-bottom-px="200"
      >
        <template #top>
          <ComposeRequestEditor
            :draft="props.draft"
            :active-tab="activeRequestTabValue"
            :compact="props.embedded"
            class="h-full"
            @update:draft="updateDraft"
            @update:active-tab="setActiveRequestTab"
          />
        </template>
        <template #bottom>
          <ComposeResponsePanel
            :response="props.response"
            :loading="props.loading"
            :error="props.error"
          />
        </template>
      </VerticalSplitPanel>

      <HorizontalSplitPanel
        v-else
        v-model="splitRatio"
        class="h-full"
        :min-left-px="280"
        :min-right-px="320"
      >
        <template #left>
          <ComposeRequestEditor
            :draft="props.draft"
            :active-tab="activeRequestTabValue"
            :compact="props.embedded"
            class="h-full"
            @update:draft="updateDraft"
            @update:active-tab="setActiveRequestTab"
          />
        </template>
        <template #right>
          <ComposeResponsePanel
            :response="props.response"
            :loading="props.loading"
            :error="props.error"
          />
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
