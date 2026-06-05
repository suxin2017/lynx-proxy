<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ApiRequestHistoryEntry } from '../types'
import { Search, Trash2 } from '@lucide/vue'
import { cn } from '@/lib/utils'
import { methodColorClass } from '../lib/method-colors'
import {
  apiStudioHintTextClass,
  apiStudioIconButtonClass,
  apiStudioSearchInputClass,
  apiStudioTreeRowClass,
  apiStudioTreeRowSelectedClass,
} from '../api-studio-styles'

const props = defineProps<{
  entries: ApiRequestHistoryEntry[]
  selectedId?: string
}>()

const emit = defineEmits<{
  select: [entry: ApiRequestHistoryEntry]
  remove: [id: string]
}>()

const searchTerm = ref('')

const filteredEntries = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()
  if (!term) return props.entries
  return props.entries.filter((entry) => {
    const haystack = `${entry.method} ${entry.url}`.toLowerCase()
    return haystack.includes(term)
  })
})

const hasEntries = computed(() => props.entries.length > 0)
const isEmptySearch = computed(
  () => hasEntries.value && filteredEntries.value.length === 0,
)
</script>

<template>
  <div class="flex min-h-0 w-full flex-1 flex-col overflow-x-hidden">
    <div
      v-if="hasEntries"
      class="shrink-0 border-b border-border/60 px-2 py-1.5"
    >
      <div class="relative min-w-0 text-[10px]">
        <Search class="pointer-events-none absolute top-1/2 left-2 size-3 -translate-y-1/2 text-muted-foreground" />
        <input
          v-model="searchTerm"
          type="search"
          :class="[apiStudioSearchInputClass, 'pl-6']"
          placeholder="搜索 method、URL…"
          autocomplete="off"
          spellcheck="false"
        >
      </div>
    </div>

    <div class="min-h-0 flex-1 px-1 py-0.5">
      <div
        v-if="!hasEntries"
        class="flex min-h-32 flex-1 items-center justify-center px-4 py-8 text-center"
      >
        <p :class="apiStudioHintTextClass">
          暂无数据
        </p>
      </div>

      <p
        v-else-if="isEmptySearch"
        :class="[apiStudioHintTextClass, 'px-2 py-6 text-center']"
      >
        没有匹配的记录
      </p>

      <button
        v-for="entry in filteredEntries"
        :key="entry.id"
        type="button"
        :title="entry.url"
        :class="cn(
          apiStudioTreeRowClass,
          'group w-full max-w-full gap-1.5 overflow-hidden pr-1 text-left',
          props.selectedId === entry.id && apiStudioTreeRowSelectedClass,
        )"
        @click="emit('select', entry)"
      >
        <span
          :class="['w-10 shrink-0 font-mono text-[10px] font-semibold', methodColorClass(entry.method)]"
        >
          {{ entry.method }}
        </span>
        <span class="min-w-0 flex-1 truncate font-mono text-[10px] text-foreground">
          {{ entry.url }}
        </span>
        <span
          role="button"
          tabindex="-1"
          :class="[apiStudioIconButtonClass, '!size-5 shrink-0 opacity-0 group-hover:opacity-100']"
          aria-label="删除"
          @click.stop="emit('remove', entry.id)"
        >
          <Trash2 class="size-2.5" />
        </span>
      </button>
    </div>
  </div>
</template>
