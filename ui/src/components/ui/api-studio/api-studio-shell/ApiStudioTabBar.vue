<script setup lang="ts">
import type { ApiStudioOpenTab } from '../types'
import { ref, toRef } from 'vue'
import { X } from '@lucide/vue'
import { cn } from '@/lib/utils'
import { useHorizontalScrollHints } from '@/components/ui/shared/useHorizontalScrollHints'
import { methodColorClass } from '../lib/method-colors'
import { apiStudioPanelPadXClass } from '../api-studio-styles'

const props = defineProps<{
  tabs: ApiStudioOpenTab[]
  activeTabId?: string
}>()

const emit = defineEmits<{
  'update:activeTabId': [id: string]
  close: [id: string]
}>()

const scrollRef = ref<HTMLElement | null>(null)
const tabsRef = toRef(props, 'tabs')

const { canScrollStart, canScrollEnd } = useHorizontalScrollHints(
  scrollRef,
  () => [tabsRef.value.length, props.activeTabId],
)

function selectTab(id: string) {
  if (id === props.activeTabId) return
  emit('update:activeTabId', id)
}

function closeTab(ev: MouseEvent, id: string) {
  ev.stopPropagation()
  emit('close', id)
}

function onTabDragStart(tab: ApiStudioOpenTab, ev: DragEvent) {
  ev.dataTransfer?.setData('application/x-lynx-api-tab', tab.id)
  if (ev.dataTransfer) {
    ev.dataTransfer.effectAllowed = 'move'
  }
}
</script>

<template>
  <div
    :class="[
      'flex h-9 shrink-0 overflow-hidden border-b border-border/60',
      apiStudioPanelPadXClass,
    ]"
  >
    <div class="relative min-w-0 flex-1">
      <div
        v-if="canScrollStart"
        class="pointer-events-none absolute inset-y-0 left-0 z-10 w-5 bg-gradient-to-r from-background via-background/80 to-transparent"
        aria-hidden="true"
      />
      <div
        v-if="canScrollEnd"
        class="pointer-events-none absolute inset-y-0 right-0 z-10 w-5 bg-gradient-to-l from-background via-background/80 to-transparent"
        aria-hidden="true"
      />

      <div
        ref="scrollRef"
        role="tablist"
        aria-label="已打开的请求"
        class="scrollbar-none flex h-9 items-stretch gap-0.5 overflow-x-auto overflow-y-hidden"
      >
        <button
          v-for="tab in props.tabs"
          :key="tab.id"
          type="button"
          role="tab"
          draggable="true"
          :aria-selected="props.activeTabId === tab.id"
          :class="cn(
            'group inline-flex h-9 max-h-9 shrink-0 cursor-grab items-center gap-2 border-b-2 px-3 text-xs font-medium transition-colors active:cursor-grabbing',
            props.activeTabId === tab.id
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:border-border/70 hover:text-foreground',
          )"
          :title="`${tab.title} — 拖到左侧文件夹可保存到集合`"
          @click="selectTab(tab.id)"
          @dragstart="onTabDragStart(tab, $event)"
        >
          <span
            v-if="tab.method"
            :class="['shrink-0 font-mono text-[10px] font-semibold tracking-wide', methodColorClass(tab.method)]"
          >
            {{ tab.method }}
          </span>
          <span class="min-w-0 truncate">
            {{ tab.title }}
          </span>
          <span
            v-if="tab.dirty"
            class="size-1.5 shrink-0 rounded-full bg-primary"
            title="未保存"
          />
          <span
            role="button"
            tabindex="-1"
            class="ml-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-opacity hover:bg-muted/60 hover:text-foreground group-hover:opacity-100"
            :class="props.activeTabId === tab.id ? 'opacity-60' : ''"
            aria-label="关闭标签"
            @click="closeTab($event, tab.id)"
          >
            <X class="size-3" />
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
