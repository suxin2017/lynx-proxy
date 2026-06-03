<script setup lang="ts">
import type { NetworkWebSocketFrame } from './types'

import { ArrowDown, ArrowUp } from '@lucide/vue'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    frames: NetworkWebSocketFrame[]
    emptyLabel?: string
    /** Epoch ms of connection start for relative timestamps */
    connectionStartMs?: number
  }>(),
  {
    emptyLabel: '暂无 WebSocket 帧',
  },
)

const sortedFrames = computed(() => {
  return [...props.frames].sort((left, right) => left.timestamp - right.timestamp)
})

function formatFrameTime(timestamp: number): string {
  if (props.connectionStartMs != null && timestamp >= props.connectionStartMs) {
    const delta = timestamp - props.connectionStartMs
    if (delta < 1000) {
      return `${delta} ms`
    }

    return `${(delta / 1000).toFixed(2)} s`
  }

  const date = new Date(timestamp)
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  const ms = String(date.getMilliseconds()).padStart(3, '0')
  return `${h}:${m}:${s}.${ms}`
}

function isOutgoing(direction: NetworkWebSocketFrame['direction']): boolean {
  return direction === 'clientToServer'
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
    <div
      v-if="sortedFrames.length === 0"
      class="px-5 py-2 text-xs text-muted-foreground"
    >
      {{ props.emptyLabel }}
    </div>

    <div
      v-else
      class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
    >
      <table class="w-full text-xs">
        <thead class="sticky top-0 z-10 bg-card/95 backdrop-blur-sm">
          <tr class="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
            <th class="w-8 px-2 py-1 font-semibold" />
            <th class="px-2 py-1 font-semibold">数据</th>
            <th class="w-[5.5rem] shrink-0 px-2 py-1 text-right font-semibold">时间</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="frame in sortedFrames"
            :key="frame.id"
            class="border-b border-border/40 align-top"
          >
            <td class="px-2 py-1">
              <ArrowUp
                v-if="isOutgoing(frame.direction)"
                class="size-3.5 text-emerald-600 dark:text-emerald-400"
                aria-label="发送"
              />
              <ArrowDown
                v-else
                class="size-3.5 text-red-600 dark:text-red-400"
                aria-label="接收"
              />
            </td>
            <td class="max-w-0 px-2 py-1 font-mono text-[11px] break-all text-foreground">
              {{ frame.previewLabel }}
            </td>
            <td class="shrink-0 px-2 py-1 text-right font-mono text-[10px] tabular-nums text-muted-foreground">
              {{ formatFrameTime(frame.timestamp) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
