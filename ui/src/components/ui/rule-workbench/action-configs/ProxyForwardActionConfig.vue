<script setup lang="ts">
import type { RuleProxyForwardActionConfig } from '../types'

interface ProxyForwardActionConfigProps {
  config: RuleProxyForwardActionConfig
}

const props = defineProps<ProxyForwardActionConfigProps>()
const emit = defineEmits<{
  'update:config': [config: RuleProxyForwardActionConfig]
}>()

function update(partial: Partial<RuleProxyForwardActionConfig>) {
  emit('update:config', {
    ...props.config,
    ...partial,
  })
}
</script>

<template>
  <div class="grid gap-2 sm:grid-cols-2">
    <label class="grid gap-1 text-[11px] text-muted-foreground">
      Scheme
      <input
        class="h-7 rounded-sm border border-input bg-background px-2 text-xs text-foreground outline-none ring-ring placeholder:text-muted-foreground focus:ring-1"
        :value="props.config.targetScheme"
        placeholder="https"
        @input="update({ targetScheme: ($event.target as HTMLInputElement).value })"
      >
    </label>

    <label class="grid gap-1 text-[11px] text-muted-foreground">
      主机与端口
      <input
        class="h-7 rounded-sm border border-input bg-background px-2 text-xs text-foreground outline-none ring-ring placeholder:text-muted-foreground focus:ring-1"
        :value="props.config.targetAuthority"
        placeholder="example.com:443"
        @input="update({ targetAuthority: ($event.target as HTMLInputElement).value })"
      >
    </label>

    <label class="grid gap-1 text-[11px] text-muted-foreground sm:col-span-2">
      路径
      <input
        class="h-7 rounded-sm border border-input bg-background px-2 text-xs text-foreground outline-none ring-ring placeholder:text-muted-foreground focus:ring-1"
        :value="props.config.targetPath"
        placeholder="/api"
        @input="update({ targetPath: ($event.target as HTMLInputElement).value })"
      >
    </label>
  </div>
</template>
