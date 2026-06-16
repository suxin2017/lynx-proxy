<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed } from 'vue'
import { cn } from '@/lib/utils'

export interface DrawerTab {
  key: string
  label: string
  badge?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<{
  modelValue: string
  tabs: DrawerTab[]
  trailing?: boolean
  ariaLabel?: string
  class?: HTMLAttributes['class']
}>(), {
  trailing: false,
  ariaLabel: '抽屉导航',
})

const emit = defineEmits<{
  'update:modelValue': [key: string]
}>()

const tabsResolved = computed(() => props.tabs)

function setTab(key: string) {
  if (key === props.modelValue) return
  const tab = tabsResolved.value.find(t => t.key === key)
  if (tab?.disabled) return
  emit('update:modelValue', key)
}
</script>

<template>
  <div
    role="tablist"
    :aria-label="props.ariaLabel"
    :class="cn('flex items-center justify-between gap-2 border-b border-border/60', props.class)"
  >
    <div class="flex min-w-0 flex-1 items-center gap-2 pl-1">
      <div class="flex min-w-0">
      <button
        v-for="tab in tabsResolved"
        :key="tab.key"
        type="button"
        role="tab"
        :aria-selected="props.modelValue === tab.key"
        :disabled="tab.disabled"
        class="-mb-px inline-flex h-9 items-center gap-2 border-b-2 px-3 text-xs font-medium transition-colors disabled:opacity-50"
        :class="props.modelValue === tab.key
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground'"
        @click="setTab(tab.key)"
      >
        <span class="truncate">{{ tab.label }}</span>
        <span
          v-if="tab.badge"
          class="inline-flex min-w-5 items-center justify-center rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-foreground"
        >
          {{ tab.badge }}
        </span>
      </button>
      </div>
    </div>

    <div v-if="props.trailing" class="flex shrink-0 items-center gap-1 px-2">
      <slot name="trailing" />
    </div>
  </div>
</template>

