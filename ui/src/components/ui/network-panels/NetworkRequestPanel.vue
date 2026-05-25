<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { TrafficRecord } from '@/components/ui/request-tree'
import { RequestTree } from '@/components/ui/request-tree'
import { NetworkRequestTable } from '@/components/ui/network-request-table'
import type { RequestViewMode } from './NetworkPanelHeader.vue'
import { cn } from '@/lib/utils'

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
      />

      <RequestTree
        v-else
        :requests="props.requests"
        :model-value="props.modelValue"
        :height="listHeight"
        @update:model-value="(id) => emit('update:modelValue', id)"
        @select="handleSelect"
      />
    </div>
  </div>
</template>
