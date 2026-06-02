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
import { createEmptyDraft } from './lib/empty-draft'
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
      </div>

      <div class="flex shrink-0 items-center gap-0.5">
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
  </section>
</template>
