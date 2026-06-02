<script setup lang="ts">
defineOptions({ name: 'RequestTree' })
import type { HTMLAttributes } from 'vue'
import { computed, ref, watch } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import type { FlatTreeNode, TrafficRecord } from './types'
import { useRequestTree } from './useRequestTree'
import RequestTreeNode from './RequestTreeNode.vue'
import { useTailScrollFollow } from '@/composables/useTailScrollFollow'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Props / Emits
// ---------------------------------------------------------------------------

interface RequestTreeProps {
  requests: TrafficRecord[]
  /** Controlled selected request id */
  modelValue?: string
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
  contextMenu: [request: TrafficRecord, ev: MouseEvent]
}>()

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

const requestsRef = computed(() => props.requests)

const {
  flatNodes,
  selectedId,
  toggle,
} = useRequestTree(requestsRef, { defaultExpandDepth: props.defaultExpandDepth })

// Sync controlled modelValue → internal selectedId
watch(() => props.modelValue, (v) => {
  selectedId.value = v
}, { immediate: true })

// ---------------------------------------------------------------------------
// Virtualizer
// ---------------------------------------------------------------------------

const ROW_HEIGHT = 28

const scrollContainerRef = ref<HTMLElement | null>(null)

const virtualizer = useVirtualizer(computed(() => ({
  count: flatNodes.value.length,
  getScrollElement: () => scrollContainerRef.value,
  estimateSize: () => ROW_HEIGHT,
  overscan: 10,
})))

const virtualItems = computed(() => virtualizer.value.getVirtualItems())
const totalSize = computed(() => virtualizer.value.getTotalSize())

useTailScrollFollow({
  scrollEl: scrollContainerRef,
  items: flatNodes,
  rowHeight: ROW_HEIGHT,
  getId: (node) => node.request?.id ?? node.id,
  followMode: 'auto',
  selectedRowId: () => props.modelValue,
})

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

function handleContextMenu(node: FlatTreeNode, _ev: MouseEvent) {
  // Right-click should also select the leaf node (detail panel follows selection).
  handleSelect(node)
  // The actual menu open is handled by the parent component that wraps RequestTree.
}
</script>

<template>
  <div :class="cn('min-h-0', props.class)">
    <div
      ref="scrollContainerRef"
      class="overflow-y-auto"
      :style="{ height: `${props.height}px` }"
    >
      <div
        v-if="flatNodes.length === 0"
        class="flex h-full items-center justify-center text-xs text-muted-foreground"
      >
        暂无请求
      </div>

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
            :node="flatNodes[virtualRow.index]"
            :selected="flatNodes[virtualRow.index].id === selectedId"
            @toggle="handleToggle"
            @select="handleSelect"
            @context-menu="(node, ev) => { handleContextMenu(node, ev); if (node.request) emit('contextMenu', node.request, ev) }"
          />
        </div>
      </div>
    </div>
  </div>
</template>
