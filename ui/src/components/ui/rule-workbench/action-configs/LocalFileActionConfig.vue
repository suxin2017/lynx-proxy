<script setup lang="ts">
import type { RuleLocalFileActionConfig } from '../types'

interface LocalFileActionConfigProps {
  config: RuleLocalFileActionConfig
}

const props = defineProps<LocalFileActionConfigProps>()
const emit = defineEmits<{
  'update:config': [config: RuleLocalFileActionConfig]
}>()

function update(partial: Partial<RuleLocalFileActionConfig>) {
  emit('update:config', {
    ...props.config,
    ...partial,
  })
}
</script>

<template>
  <div class="grid gap-2 sm:grid-cols-2">
    <label class="grid gap-1 text-[11px] text-muted-foreground sm:col-span-2">
      文件路径
      <input
        class="h-7 rounded-sm border border-input bg-background px-2 text-xs text-foreground outline-none ring-ring placeholder:text-muted-foreground focus:ring-1"
        :value="props.config.filePath"
        placeholder="/path/to/file.html"
        @input="update({ filePath: ($event.target as HTMLInputElement).value })"
      >
    </label>

    <label class="grid gap-1 text-[11px] text-muted-foreground">
      内容类型
      <input
        class="h-7 rounded-sm border border-input bg-background px-2 text-xs text-foreground outline-none ring-ring placeholder:text-muted-foreground focus:ring-1"
        :value="props.config.contentType"
        placeholder="text/html"
        @input="update({ contentType: ($event.target as HTMLInputElement).value })"
      >
    </label>

    <label class="grid gap-1 text-[11px] text-muted-foreground">
      状态码
      <input
        type="number"
        min="100"
        max="599"
        class="h-7 rounded-sm border border-input bg-background px-2 text-xs text-foreground outline-none ring-ring focus:ring-1"
        :value="props.config.statusCode ?? ''"
        @input="update({ statusCode: ($event.target as HTMLInputElement).value === '' ? undefined : Number(($event.target as HTMLInputElement).value) })"
      >
    </label>
  </div>
</template>
