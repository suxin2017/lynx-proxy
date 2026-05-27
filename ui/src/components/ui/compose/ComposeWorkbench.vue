<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { ComposeDraft, ComposeLayout, ComposeRequestTab, ComposeResponse } from './types'

import { ref } from 'vue'
import { Columns2, Rows2 } from '@lucide/vue'

import { HorizontalSplitPanel, VerticalSplitPanel } from '@/components/ui/split-panels'
import { cn } from '@/lib/utils'

import { composeGhostButtonClass, composeSectionTitleClass } from './compose-styles'
import ComposeRequestBar from './ComposeRequestBar.vue'
import ComposeRequestEditor from './ComposeRequestEditor.vue'
import ComposeResponsePanel from './ComposeResponsePanel.vue'
import CurlImportDialog from './CurlImportDialog.vue'
import { createEmptyDraft } from './lib/empty-draft'
import { exportDraftToCurl } from './lib/export-curl'
import { mergeCurlIntoDraft } from './lib/parse-curl'
import { syncDraftUrlToParams } from './lib/parse-url-params'

const props = withDefaults(defineProps<{
  draft: ComposeDraft
  response?: ComposeResponse | null
  loading?: boolean
  error?: string | null
  layout?: ComposeLayout
  activeRequestTab?: ComposeRequestTab
  class?: HTMLAttributes['class']
}>(), {
  response: null,
  loading: false,
  error: null,
  layout: 'vertical',
  activeRequestTab: 'params',
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
const curlDialogOpen = ref(false)
const curlImportError = ref<string | null>(null)
const copyHint = ref<string | null>(null)

function updateDraft(draft: ComposeDraft) {
  emit('update:draft', draft)
}

function onUrlChange(url: string) {
  updateDraft(syncDraftUrlToParams(props.draft, url))
}

function onSend() {
  emit('send', props.draft)
}

function onReset() {
  curlImportError.value = null
  emit('update:draft', createEmptyDraft())
  emit('reset')
}

async function onExportCurl() {
  const curl = exportDraftToCurl(props.draft)
  if (!curl) {
    copyHint.value = '请先填写 URL'
    return
  }

  emit('export-curl', curl)

  try {
    await navigator.clipboard.writeText(curl)
    copyHint.value = 'cURL 已复制到剪贴板'
  }
  catch {
    copyHint.value = 'cURL 已生成（复制失败，请手动复制）'
  }

  window.setTimeout(() => {
    copyHint.value = null
  }, 2000)
}

function onCurlConfirm(curlText: string) {
  try {
    const next = mergeCurlIntoDraft(props.draft, curlText)
    curlImportError.value = null
    curlDialogOpen.value = false
    emit('update:draft', next)
    emit('import-curl', next)
  }
  catch (error) {
    curlImportError.value = error instanceof Error ? error.message : '解析 cURL 失败'
  }
}

function toggleLayout() {
  emit('update:layout', props.layout === 'vertical' ? 'horizontal' : 'vertical')
}
</script>

<template>
  <section
    :class="cn(
      'flex h-full min-h-[32rem] flex-col overflow-hidden rounded-lg border border-border bg-card',
      props.class,
    )"
  >
    <div class="flex items-center justify-between gap-3 px-3 pt-2.5 pb-1">
      <div class="min-w-0">
        <h2 :class="composeSectionTitleClass">
          Compose
        </h2>
        <p v-if="copyHint" class="truncate text-[10px] text-muted-foreground">
          {{ copyHint }}
        </p>
      </div>

      <div class="flex shrink-0 items-center gap-0.5">
        <button type="button" :class="composeGhostButtonClass" @click="curlDialogOpen = true">
          导入 cURL
        </button>
        <button type="button" :class="composeGhostButtonClass" @click="onExportCurl">
          复制 cURL
        </button>
        <button type="button" :class="composeGhostButtonClass" @click="onReset">
          清空
        </button>
        <button
          type="button"
          :class="composeGhostButtonClass"
          :title="props.layout === 'vertical' ? '切换为左右布局' : '切换为上下布局'"
          @click="toggleLayout"
        >
          <Rows2 v-if="props.layout === 'vertical'" class="size-3.5" />
          <Columns2 v-else class="size-3.5" />
        </button>
      </div>
    </div>

    <ComposeRequestBar
      :draft="props.draft"
      :loading="props.loading"
      @update:method="updateDraft({ ...props.draft, method: $event })"
      @update:url="onUrlChange"
      @send="onSend"
    />

    <div class="min-h-0 flex-1 px-1 pb-1">
      <VerticalSplitPanel
        v-if="props.layout === 'vertical'"
        v-model="splitRatio"
        class="h-full"
        :min-top-px="200"
        :min-bottom-px="200"
      >
        <template #top>
          <ComposeRequestEditor
            :draft="props.draft"
            :active-tab="props.activeRequestTab"
            class="h-full"
            @update:draft="updateDraft"
            @update:active-tab="emit('update:activeRequestTab', $event)"
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
            :active-tab="props.activeRequestTab"
            class="h-full"
            @update:draft="updateDraft"
            @update:active-tab="emit('update:activeRequestTab', $event)"
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

    <CurlImportDialog
      v-model:open="curlDialogOpen"
      :error="curlImportError"
      @confirm="onCurlConfirm"
      @cancel="curlImportError = null"
    />
  </section>
</template>
