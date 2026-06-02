<script setup lang="ts">
import { computed } from 'vue'
import type { RuleThrottleActionConfig, RuleThrottlePreset } from '../types'

interface ThrottleActionConfigProps {
  config: RuleThrottleActionConfig
}

const props = defineProps<ThrottleActionConfigProps>()
const emit = defineEmits<{
  'update:config': [config: RuleThrottleActionConfig]
}>()

const isCustom = computed(() => props.config.preset === 'Custom')
const isOffline = computed(() => props.config.preset === 'Offline')

function update(partial: Partial<RuleThrottleActionConfig>) {
  emit('update:config', {
    ...props.config,
    ...partial,
  })
}

function updatePreset(preset: RuleThrottlePreset) {
  if (preset !== 'Custom') {
    update({
      preset,
      downloadKbps: undefined,
      uploadKbps: undefined,
      latencyMs: undefined,
    })
    return
  }
  update({ preset })
}

function parseOptionalNumber(raw: string): number | undefined {
  if (raw === '') return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}
</script>

<template>
  <div class="grid gap-2 sm:grid-cols-2">
    <label class="grid gap-1 text-[11px] text-muted-foreground sm:col-span-2">
      预设
      <select
        class="h-7 rounded-sm border border-input bg-background px-2 text-xs text-foreground outline-none ring-ring focus:ring-1"
        :value="props.config.preset"
        @change="updatePreset(($event.target as HTMLSelectElement).value as RuleThrottlePreset)"
      >
        <option value="Slow3G">Slow3G（500↓ / 400↑ / 400ms）</option>
        <option value="Fast3G">Fast3G（1600↓ / 750↑ / 150ms）</option>
        <option value="Offline">Offline（直接返回 503）</option>
        <option value="Custom">Custom（自定义）</option>
      </select>
    </label>

    <div
      v-if="isOffline"
      class="rounded-sm bg-muted/45 px-2 py-1.5 text-[11px] text-muted-foreground ring-1 ring-border/30 sm:col-span-2"
    >
      该动作会模拟断网：请求将直接返回 503，并带有响应头 <code>x-throttled-by</code>。
    </div>

    <div
      v-else-if="!isCustom"
      class="rounded-sm bg-muted/45 px-2 py-1.5 text-[11px] text-muted-foreground ring-1 ring-border/30 sm:col-span-2"
    >
      预设模式下无需填写参数；如需自定义带宽/延迟，请选择 Custom。
    </div>

    <template v-else>
      <label class="grid gap-1 text-[11px] text-muted-foreground">
        下载 (Kbps)
        <input
          type="number"
          min="0"
          class="h-7 rounded-sm border border-input bg-background px-2 text-xs text-foreground outline-none ring-ring focus:ring-1"
          :value="props.config.downloadKbps ?? ''"
          placeholder="0"
          @input="update({ downloadKbps: parseOptionalNumber(($event.target as HTMLInputElement).value) })"
        >
      </label>

      <label class="grid gap-1 text-[11px] text-muted-foreground">
        上传 (Kbps)
        <input
          type="number"
          min="0"
          class="h-7 rounded-sm border border-input bg-background px-2 text-xs text-foreground outline-none ring-ring focus:ring-1"
          :value="props.config.uploadKbps ?? ''"
          placeholder="0"
          @input="update({ uploadKbps: parseOptionalNumber(($event.target as HTMLInputElement).value) })"
        >
      </label>

      <label class="grid gap-1 text-[11px] text-muted-foreground sm:col-span-2">
        往返延迟 (ms)
        <input
          type="number"
          min="0"
          class="h-7 rounded-sm border border-input bg-background px-2 text-xs text-foreground outline-none ring-ring focus:ring-1"
          :value="props.config.latencyMs ?? ''"
          placeholder="0"
          @input="update({ latencyMs: parseOptionalNumber(($event.target as HTMLInputElement).value) })"
        >
      </label>

      <div class="text-[11px] text-muted-foreground sm:col-span-2">
        Kbps 为千比特每秒（kilobits/s）；0 表示不限制。
      </div>
    </template>
  </div>
</template>

