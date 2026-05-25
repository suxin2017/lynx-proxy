<script setup lang="ts">
defineOptions({ name: 'RequestTree' })
import type { HTMLAttributes } from 'vue'
import { computed, ref, watch } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import type { FlatTreeNode, TrafficRecord } from './types'
import { useRequestTree } from './useRequestTree'
import RequestTreeNode from './RequestTreeNode.vue'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Props / Emits
// ---------------------------------------------------------------------------

interface RequestTreeProps {
  requests: TrafficRecord[]
  /** Controlled selected request id */
  modelValue?: string
  /** External search term – overrides internal search box when provided */
  filter?: string
  /** How many depth levels to auto-expand on mount (default: 1) */
  defaultExpandDepth?: number
  /** Container height in px (default: 400) */
  height?: number
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<RequestTreeProps>(), {
  defaultExpandDepth: 1,
  height: 400,
})

const emit = defineEmits<{
  'update:modelValue': [id: string]
  select: [request: TrafficRecord]
}>()

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

const requestsRef = computed(() => props.requests)

const {
  filteredNodes,
  searchTerm,
  selectedId,
  toggle,
} = useRequestTree(requestsRef, { defaultExpandDepth: props.defaultExpandDepth })

// Sync controlled modelValue → internal selectedId
watch(() => props.modelValue, (v) => {
  selectedId.value = v
}, { immediate: true })

// Sync external filter prop → internal searchTerm
watch(() => props.filter, (v) => {
  if (v !== undefined) searchTerm.value = v
}, { immediate: true })

// ---------------------------------------------------------------------------
// Virtualizer
// ---------------------------------------------------------------------------

const ROW_HEIGHT = 32

const scrollContainerRef = ref<HTMLElement | null>(null)

const virtualizer = useVirtualizer(computed(() => ({
  count: filteredNodes.value.length,
  getScrollElement: () => scrollContainerRef.value,
  estimateSize: () => ROW_HEIGHT,
  overscan: 10,
})))

const virtualItems = computed(() => virtualizer.value.getVirtualItems())
const totalSize = computed(() => virtualizer.value.getTotalSize())
const highlightTerm = computed(() => searchTerm.value.trim())

// ---------------------------------------------------------------------------
// Interaction handlers
// ---------------------------------------------------------------------------

function handleToggle(id: string) {
  toggle(id)
}

function handleSelect(node: FlatTreeNode) {
  if (!node.request) return
  selectedId.value = node.request.id
  emit('update:modelValue', node.request.id)
  emit('select', node.request)
}
</script>

<template>
  <div :class="cn('flex flex-col gap-1', props.class)">
    <!-- Search slot: consumer can replace with own input -->
    <slot name="search">
      <div class="px-1">
        <input
          v-model="searchTerm"
          type="text"
          placeholder="筛选请求…"
          class="h-8 w-full rounded-sm border border-input bg-background px-2 text-xs transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
      </div>
    </slot>

    <!-- Virtual scroll container -->
    <div
      ref="scrollContainerRef"
      class="overflow-y-auto"
      :style="{ height: `${props.height}px` }"
    >
      <!-- Empty state -->
      <div
        v-if="filteredNodes.length === 0"
        class="flex h-full items-center justify-center text-xs text-muted-foreground"
      >
        {{ searchTerm ? '无匹配请求' : '暂无请求' }}
      </div>

      <!-- Total height spacer -->
      <div v-else :style="{ height: `${totalSize}px`, position: 'relative' }">
        <div
          v-for="virtualRow in virtualItems"
          :key="`row-${virtualRow.index}`"
          :style="{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: `${ROW_HEIGHT}px`,
            transform: `translateY(${virtualRow.start}px)`,
          }"
        >
          <RequestTreeNode
            :node="filteredNodes[virtualRow.index]"
            :selected="filteredNodes[virtualRow.index].id === selectedId"
            :highlight-term="highlightTerm"
            @toggle="handleToggle"
            @select="handleSelect"
          />
        </div>
      </div>
    </div>
  </div>
</template>
