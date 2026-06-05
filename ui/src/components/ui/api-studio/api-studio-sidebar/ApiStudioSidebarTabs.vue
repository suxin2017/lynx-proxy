<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { ApiStudioSidebarView } from '../types'
import { History, Layers } from '@lucide/vue'
import type { Component } from 'vue'
import { cn } from '@/lib/utils'
import { apiStudioIconButtonClass } from '../api-studio-styles'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()

const view = defineModel<ApiStudioSidebarView>('view', { default: 'collections' })

const tabs: { id: ApiStudioSidebarView; label: string; icon: Component }[] = [
  { id: 'collections', label: '集合', icon: Layers },
  { id: 'history', label: '历史', icon: History },
]
</script>

<template>
  <div
    role="tablist"
    aria-label="侧栏视图"
    :class="cn('flex items-center justify-end gap-0.5', props.class)"
  >
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      role="tab"
      :aria-selected="view === tab.id"
      :aria-label="tab.label"
      :title="tab.label"
      :class="cn(
        apiStudioIconButtonClass,
        '!size-6',
        view === tab.id && 'bg-muted/60 text-foreground ring-1 ring-border/50',
      )"
      @click="view = tab.id"
    >
      <component :is="tab.icon" class="size-3" aria-hidden="true" />
    </button>
  </div>
</template>
