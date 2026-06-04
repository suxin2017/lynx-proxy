<script setup lang="ts">
import type { RuleDelayActionConfig } from '../types'

interface DelayActionConfigProps {
  config: RuleDelayActionConfig
}

const props = defineProps<DelayActionConfigProps>()
const emit = defineEmits<{
  'update:config': [config: RuleDelayActionConfig]
}>()

function update(partial: Partial<RuleDelayActionConfig>) {
  emit('update:config', {
    ...props.config,
    ...partial,
  })
}
</script>

<template>
  <div class="grid gap-2 sm:grid-cols-2">
    <label class="grid gap-1 text-[11px] text-muted-foreground">
      延迟 (ms)
      <input
        type="number"
        min="0"
        class="h-7 rounded-sm border border-input bg-background px-2 text-xs text-foreground outline-none ring-ring focus:ring-1"
        :value="props.config.delayMs"
        @input="update({ delayMs: Number(($event.target as HTMLInputElement).value || 0) })"
      >
    </label>

    <label class="grid gap-1 text-[11px] text-muted-foreground">
      波动 (ms)
      <input
        type="number"
        min="0"
        class="h-7 rounded-sm border border-input bg-background px-2 text-xs text-foreground outline-none ring-ring focus:ring-1"
        :value="props.config.varianceMs ?? ''"
        @input="update({ varianceMs: ($event.target as HTMLInputElement).value === '' ? undefined : Number(($event.target as HTMLInputElement).value) })"
      >
    </label>

    <label class="grid gap-1 text-[11px] text-muted-foreground sm:col-span-2">
      延迟类型
      <select
        class="h-7 rounded-sm border border-input bg-background px-2 text-xs text-foreground outline-none ring-ring focus:ring-1"
        :value="props.config.delayType"
        @change="update({ delayType: ($event.target as HTMLSelectElement).value as RuleDelayActionConfig['delayType'] })"
      >
        <option value="beforeRequest">beforeRequest（请求前）</option>
        <option value="afterRequest">afterRequest（请求后）</option>
        <option value="both">both（前后）</option>
      </select>
    </label>
  </div>
</template>
