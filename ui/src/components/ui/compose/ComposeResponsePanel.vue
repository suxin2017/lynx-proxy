<script setup lang="ts">
import type { ComposeResponse } from './types'
import type { WorkbenchType } from '@/components/ui/content-workbench/utils'

import { computed, ref } from 'vue'

import { ContentWorkbench } from '@/components/ui/content-workbench'
import { cn } from '@/lib/utils'

import {
  composeErrorTextClass,
  composeHintTextClass,
  composePanelInsetClass,
  composeSectionTitleClass,
  composeTabActiveClass,
  composeTabClass,
} from './compose-styles'

const props = defineProps<{
  response?: ComposeResponse | null
  loading?: boolean
  error?: string | null
}>()

const RESPONSE_TABS = ['headers', 'body'] as const
type ResponseTab = typeof RESPONSE_TABS[number]

const activeTab = ref<ResponseTab>('body')

function bytes(value: number): string {
  if (value < 1024) {
    return `${value} B`
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`
  }
  return `${(value / (1024 * 1024)).toFixed(2)} MB`
}

function statusTone(status: number): string {
  if (status >= 200 && status < 300) {
    return 'text-emerald-600 dark:text-emerald-400'
  }
  if (status >= 300 && status < 400) {
    return 'text-amber-600 dark:text-amber-400'
  }
  if (status >= 400) {
    return 'text-destructive'
  }
  return 'text-foreground'
}

const headerRows = computed(() => {
  if (!props.response?.headers) {
    return []
  }
  return Object.entries(props.response.headers).map(([key, value]) => ({ key, value }))
})

const bodyType = computed((): WorkbenchType => {
  const contentType = Object.entries(props.response?.headers ?? {}).find(
    ([key]) => key.toLowerCase() === 'content-type',
  )?.[1]?.toLowerCase() ?? ''

  if (contentType.includes('application/json')) {
    return 'json'
  }
  if (contentType.includes('text/html')) {
    return 'html-source'
  }
  if (contentType.includes('xml')) {
    return 'xml-source'
  }
  return 'text'
})
</script>

<template>
  <section class="flex h-full min-h-0 flex-col overflow-hidden px-2 pb-2">
    <div v-if="props.loading" class="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-xs text-muted-foreground">
      <div class="size-5 animate-spin rounded-full border-2 border-muted-foreground/25 border-t-foreground" />
      <span>发送中…</span>
    </div>

    <div v-else-if="props.error" class="flex flex-1 items-center justify-center p-4">
      <p :class="['max-w-md rounded-sm bg-destructive/10 px-2.5 py-1.5', composeErrorTextClass]">
        {{ props.error }}
      </p>
    </div>

    <div v-else-if="!props.response" class="flex flex-1 flex-col justify-center gap-1 p-4">
      <h3 :class="composeSectionTitleClass">
        响应
      </h3>
      <p :class="composeHintTextClass">
        发送请求后在此查看响应。
      </p>
    </div>

    <template v-else>
      <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-1.5">
        <h3 :class="composeSectionTitleClass">
          响应
        </h3>
        <span :class="cn('font-mono text-xs font-semibold', statusTone(props.response.status))">
          {{ props.response.status }} {{ props.response.statusText }}
        </span>
        <span class="text-xs text-muted-foreground">{{ props.response.responseTime }} ms</span>
        <span class="text-xs text-muted-foreground">{{ bytes(props.response.size) }}</span>
      </div>

      <nav class="flex items-center gap-0.5 pb-1.5">
        <button
          v-for="tab in RESPONSE_TABS"
          :key="tab"
          type="button"
          :class="[composeTabClass, activeTab === tab ? composeTabActiveClass : 'hover:bg-muted/30']"
          @click="activeTab = tab"
        >
          {{ tab }}
        </button>
      </nav>

      <div class="min-h-0 flex-1 overflow-auto rounded-sm" :class="composePanelInsetClass">
        <div v-if="activeTab === 'headers'" class="overflow-auto py-1">
          <div
            v-for="row in headerRows"
            :key="`rh-${row.key}`"
            class="grid grid-cols-[minmax(7rem,34%)_1fr] gap-x-3 px-2 py-1 text-xs"
          >
            <span class="font-mono text-[11px] text-muted-foreground">{{ row.key }}</span>
            <span class="font-mono text-[11px] break-all">{{ row.value }}</span>
          </div>
          <p v-if="headerRows.length === 0" class="px-2 py-2 text-xs text-muted-foreground">
            无响应 Headers
          </p>
        </div>

        <ContentWorkbench
          v-else
          :type="bodyType"
          :content="props.response.body"
          frameless
          class="min-h-[10rem]"
        />
      </div>
    </template>
  </section>
</template>
