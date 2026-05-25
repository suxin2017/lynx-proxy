<script setup lang="ts">
import type { RuleBlockActionConfig } from '../types'

interface BlockActionConfigProps {
  config: RuleBlockActionConfig
}

const props = defineProps<BlockActionConfigProps>()
const emit = defineEmits<{
  'update:config': [config: RuleBlockActionConfig]
}>()

function update(partial: Partial<RuleBlockActionConfig>) {
  emit('update:config', {
    ...props.config,
    ...partial,
  })
}
</script>

<template>
  <div class="grid gap-2 sm:grid-cols-2">
    <label class="grid gap-1 text-[11px] text-muted-foreground">
      状态码
      <input
        type="number"
        min="100"
        max="599"
        class="h-7 rounded-sm border border-input bg-background px-2 text-xs text-foreground outline-none ring-ring focus:ring-1"
        :value="props.config.statusCode"
        @input="update({ statusCode: Number(($event.target as HTMLInputElement).value || 403) })"
      >
    </label>

    <label class="grid gap-1 text-[11px] text-muted-foreground">
      原因
      <input
        class="h-7 rounded-sm border border-input bg-background px-2 text-xs text-foreground outline-none ring-ring placeholder:text-muted-foreground focus:ring-1"
        :value="props.config.reason"
        placeholder="请求已被代理拦截"
        @input="update({ reason: ($event.target as HTMLInputElement).value })"
      >
    </label>
  </div>
</template>
