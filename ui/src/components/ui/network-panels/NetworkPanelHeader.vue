
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type RequestViewMode = 'table' | 'tree'

interface NetworkPanelHeaderProps {
  viewMode: RequestViewMode
  requestCount: number
  class?: HTMLAttributes['class']
}

const props = defineProps<NetworkPanelHeaderProps>()

const emit = defineEmits<{
  'update:viewMode': [mode: RequestViewMode]
}>()

const setViewMode = (mode: RequestViewMode) => {
  if (mode === props.viewMode) {
    return
  }

  emit('update:viewMode', mode)
}
</script>

<template>
  <header :class="cn('flex items-center justify-between gap-2 border-b border-border px-2 py-2', props.class)">
    <div class="min-w-0">
      <p class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">requests</p>
      <p class="truncate text-xs text-muted-foreground">{{ props.requestCount }} total</p>
    </div>

    <div class="inline-flex items-center gap-1 rounded-md border border-border bg-muted/20 p-1">
      <Button
        size="sm"
        :variant="props.viewMode === 'table' ? 'default' : 'ghost'"
        class="h-7 px-2"
        @click="setViewMode('table')"
      >
        Table
      </Button>
      <Button
        size="sm"
        :variant="props.viewMode === 'tree' ? 'default' : 'ghost'"
        class="h-7 px-2"
        @click="setViewMode('tree')"
      >
        Tree
      </Button>
    </div>
  </header>
</template>
