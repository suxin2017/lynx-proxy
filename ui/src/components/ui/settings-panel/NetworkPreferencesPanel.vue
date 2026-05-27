<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed } from 'vue'
import { ListTree, Sheet } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import type { RequestViewMode } from '@/components/ui/network-panels'
import { cn } from '@/lib/utils'
import {
  settingsLabelClass,
  settingsRowGridClass,
  settingsSectionTitleClass,
} from './settings-styles'

interface NetworkPreferencesPanelProps {
  class?: HTMLAttributes['class']
  connectionState?: string
}

const props = defineProps<NetworkPreferencesPanelProps>()

const viewMode = defineModel<RequestViewMode>('viewMode', { required: true })
const splitRatio = defineModel<number>('splitRatio', { required: true })
const tableSplitRatio = defineModel<number>('tableSplitRatio', { required: true })
const streamEnabled = defineModel<boolean>('streamEnabled', { required: true })

const emit = defineEmits<{
  reset: []
}>()

const connectionLabel = computed(() => props.connectionState ?? '—')

function setViewMode(mode: RequestViewMode) {
  viewMode.value = mode
}

function onSplitRatioInput(event: Event) {
  splitRatio.value = Number((event.target as HTMLInputElement).value)
}

function onTableSplitRatioInput(event: Event) {
  tableSplitRatio.value = Number((event.target as HTMLInputElement).value)
}

function handleReset() {
  if (!window.confirm('确定重置 Network 本地偏好？')) {
    return
  }

  emit('reset')
}
</script>

<template>
  <div :class="cn('space-y-6', props.class)">
    <section class="space-y-1">
      <h2 :class="settingsSectionTitleClass">
        Network 展示
      </h2>

      <div :class="settingsRowGridClass">
        <span :class="settingsLabelClass">视图模式</span>
        <div class="inline-flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            type="button"
            class="size-6"
            title="Table View"
            :aria-pressed="viewMode === 'table'"
            @click="setViewMode('table')"
          >
            <Sheet
              :class="cn(
                'h-3.5 w-3.5',
                viewMode === 'table' ? 'text-primary' : 'text-muted-foreground/60',
              )"
            />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            type="button"
            class="size-6"
            title="Tree View"
            :aria-pressed="viewMode === 'tree'"
            @click="setViewMode('tree')"
          >
            <ListTree
              :class="cn(
                'h-3.5 w-3.5',
                viewMode === 'tree' ? 'text-primary' : 'text-muted-foreground/60',
              )"
            />
          </Button>
        </div>
      </div>

      <div
        v-if="viewMode === 'tree'"
        :class="settingsRowGridClass"
      >
        <span :class="settingsLabelClass">左右分割</span>
        <div class="flex min-w-0 items-center gap-2">
          <input
            type="range"
            min="20"
            max="80"
            step="1"
            class="min-w-0 flex-1 accent-primary"
            :value="splitRatio"
            @input="onSplitRatioInput"
          >
          <span class="w-8 shrink-0 text-right tabular-nums text-muted-foreground">
            {{ splitRatio }}%
          </span>
        </div>
      </div>

      <div
        v-if="viewMode === 'table'"
        :class="settingsRowGridClass"
      >
        <span :class="settingsLabelClass">上下分割</span>
        <div class="flex min-w-0 items-center gap-2">
          <input
            type="range"
            min="20"
            max="80"
            step="1"
            class="min-w-0 flex-1 accent-primary"
            :value="tableSplitRatio"
            @input="onTableSplitRatioInput"
          >
          <span class="w-8 shrink-0 text-right tabular-nums text-muted-foreground">
            {{ tableSplitRatio }}%
          </span>
        </div>
      </div>

      <div :class="settingsRowGridClass">
        <span :class="settingsLabelClass">实时流</span>
        <div class="justify-self-start">
          <Switch v-model:checked="streamEnabled" />
        </div>
      </div>
    </section>

    <section class="space-y-1">
      <h2 :class="settingsSectionTitleClass">
        数据
      </h2>
      <div :class="settingsRowGridClass">
        <span :class="settingsLabelClass">本地偏好</span>
        <Button
          type="button"
          variant="outline"
          size="default"
          class="h-6 justify-self-start px-2 text-[11px]"
          @click="handleReset"
        >
          重置 Network 偏好
        </Button>
      </div>
    </section>

    <section class="space-y-1">
      <h2 :class="settingsSectionTitleClass">
        连接
      </h2>
      <div :class="settingsRowGridClass">
        <span :class="settingsLabelClass">WebSocket</span>
        <span class="font-mono text-[11px] text-foreground">{{ connectionLabel }}</span>
      </div>
    </section>
  </div>
</template>
