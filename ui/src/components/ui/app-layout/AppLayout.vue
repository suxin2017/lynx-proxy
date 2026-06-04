<script setup lang="ts">
import type { HTMLAttributes, Component } from 'vue'
import { computed, ref, watch } from 'vue'
import { cn } from '@/lib/utils'

export interface AppLayoutMenuItem {
  key: string
  label: string
  icon: Component
  disabled?: boolean
}

interface AppLayoutProps {
  items: AppLayoutMenuItem[]
  modelValue?: string
  defaultValue?: string
  class?: HTMLAttributes['class']
  panelClass?: HTMLAttributes['class']
}

const props = defineProps<AppLayoutProps>()

const emit = defineEmits<{
  'update:modelValue': [key: string]
  change: [key: string]
}>()

const fallbackKey = computed(() => props.items[0]?.key ?? '')

const activeKey = ref(
  props.modelValue
    ?? props.defaultValue
    ?? fallbackKey.value,
)

watch(() => props.items, (nextItems) => {
  if (nextItems.length === 0) {
    activeKey.value = ''
    return
  }

  const exists = nextItems.some(item => item.key === activeKey.value)
  if (!exists) {
    activeKey.value = nextItems[0].key
  }
}, { immediate: true })

watch(() => props.modelValue, (nextValue) => {
  if (nextValue !== undefined) {
    activeKey.value = nextValue
  }
})

function isActive(key: string): boolean {
  return activeKey.value === key
}

function activateItem(key: string, disabled?: boolean) {
  if (disabled || isActive(key)) return

  activeKey.value = key
  emit('update:modelValue', key)
  emit('change', key)
}
</script>

<template>
  <section
    :class="cn(
      'grid min-h-0 w-full grid-cols-[3rem_minmax(0,1fr)] overflow-hidden rounded-lg border border-sidebar-border bg-background shadow-sm md:grid-cols-[3.25rem_minmax(0,1fr)]',
      props.class,
    )"
  >
    <aside class="flex flex-col border-r border-sidebar-border bg-sidebar/95">
      <nav class="flex flex-1 flex-col items-center gap-0.5 px-1 py-1.5 md:gap-1 md:px-1.5 md:py-2">
        <button
          v-for="item in props.items"
          :key="item.key"
          type="button"
          class="group relative flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-sidebar-foreground/30 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sidebar-ring disabled:cursor-not-allowed disabled:opacity-40 md:h-9 md:w-9"
          :class="isActive(item.key)
            ? 'text-sidebar-primary'
            : 'hover:text-sidebar-foreground/70'"
          :aria-label="item.label"
          :title="item.label"
          :disabled="item.disabled"
          @click="activateItem(item.key, item.disabled)"
        >
          <component :is="item.icon" class="h-5 w-5 transition-transform duration-150" :class="isActive(item.key) ? 'scale-110' : ''" />
        </button>
      </nav>

      <div class="flex items-center justify-center border-t border-sidebar-border p-1.5 md:p-2">
        <slot name="sidebar-footer" />
      </div>
    </aside>

    <main :class="cn('min-h-0 min-w-0 overflow-hidden bg-background', props.panelClass)">
      <slot :active-key="activeKey" />
    </main>
  </section>
</template>
