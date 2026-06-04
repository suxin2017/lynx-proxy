<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { TrafficRecord } from '@/components/ui/request-tree'
import { RequestTree } from '@/components/ui/request-tree'
import { NetworkRequestTable } from '@/components/ui/network-request-table'
import TrafficContextMenu from './TrafficContextMenu.vue'
import type { RequestViewMode } from './NetworkPanelHeader.vue'
import { cn } from '@/lib/utils'
import type { FlatTreeNode } from '@/components/ui/request-tree/types'

interface NetworkRequestPanelProps {
  requests: TrafficRecord[]
  modelValue?: string
  viewMode: RequestViewMode
  height?: number
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<NetworkRequestPanelProps>(), {
  height: 560,
})

const emit = defineEmits<{
  'update:modelValue': [id: string]
  select: [request: TrafficRecord]
}>()

const bodyRef = ref<HTMLElement | null>(null)
const listHeight = ref(props.height)
let resizeObserver: ResizeObserver | null = null

const syncListHeight = () => {
  const height = bodyRef.value?.clientHeight ?? props.height
  listHeight.value = Math.max(220, Math.floor(height))
}

onMounted(() => {
  syncListHeight()

  if (typeof ResizeObserver === 'undefined') {
    return
  }

  resizeObserver = new ResizeObserver(() => {
    syncListHeight()
  })

  if (bodyRef.value) {
    resizeObserver.observe(bodyRef.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})

const handleSelect = (request: TrafficRecord) => {
  emit('update:modelValue', request.id)
  emit('select', request)
}

const menuRecordId = ref<string | undefined>(undefined)
const menuMatchExpr = ref<string | undefined>(undefined)
const menuPoint = ref({ x: 0, y: 0 })
const menuOpenKey = ref(0)

const isFlatTreeNode = (value: unknown): value is FlatTreeNode => {
  const v = value as any
  return v && typeof v === 'object'
    && (v.type === 'group' || v.type === 'leaf')
    && typeof v.fullLabel === 'string'
}

const openContextMenu = (target: TrafficRecord | FlatTreeNode, ev: MouseEvent) => {
  if (isFlatTreeNode(target)) {
    menuRecordId.value = target.request?.id
    menuMatchExpr.value = target.type === 'group' ? target.fullLabel : undefined
    menuPoint.value = { x: ev.clientX, y: ev.clientY }
    menuOpenKey.value += 1
    return
  }

  menuRecordId.value = target.id
  // Provide a fallback match expression so focus/ignore can work even if
  // the detail record is not yet available in the store.
  menuMatchExpr.value = target.url
  menuPoint.value = { x: ev.clientX, y: ev.clientY }
  menuOpenKey.value += 1
}
</script>

<template>
  <div :class="cn('flex h-full min-h-0 flex-col', props.class)">
    <div ref="bodyRef" class="min-h-0 flex-1">
      <NetworkRequestTable
        v-if="props.viewMode === 'table'"
        :requests="props.requests"
        :model-value="props.modelValue"
        :height="listHeight"
        @update:model-value="(id) => emit('update:modelValue', id)"
        @select="handleSelect"
        @context-menu="openContextMenu"
      />

      <RequestTree
        v-else
        :requests="props.requests"
        :model-value="props.modelValue"
        :height="listHeight"
        @update:model-value="(id) => emit('update:modelValue', id)"
        @select="handleSelect"
        @context-menu="openContextMenu"
      />
    </div>

    <TrafficContextMenu
      :record-id="menuRecordId"
      :match-expr="menuMatchExpr"
      :x="menuPoint.x"
      :y="menuPoint.y"
      :open-key="menuOpenKey"
    />
  </div>
</template>
