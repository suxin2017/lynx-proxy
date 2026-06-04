<script setup lang="ts">
import type { RuleHtmlScriptInjectorActionConfig } from '../types'

interface HtmlScriptInjectorActionConfigProps {
  config: RuleHtmlScriptInjectorActionConfig
}

const props = defineProps<HtmlScriptInjectorActionConfigProps>()
const emit = defineEmits<{
  'update:config': [config: RuleHtmlScriptInjectorActionConfig]
}>()

function update(partial: Partial<RuleHtmlScriptInjectorActionConfig>) {
  emit('update:config', {
    ...props.config,
    ...partial,
  })
}
</script>

<template>
  <div class="grid gap-2 sm:grid-cols-2">
    <label class="grid gap-1 text-[11px] text-muted-foreground sm:col-span-2">
      脚本内容
      <textarea
        rows="4"
        class="rounded-sm border border-input bg-background px-2 py-1.5 text-xs text-foreground outline-none ring-ring placeholder:text-muted-foreground focus:ring-1"
        :value="props.config.content"
        placeholder="<script>console.log('hello')</script>"
        @input="update({ content: ($event.target as HTMLTextAreaElement).value })"
      />
    </label>

    <label class="grid gap-1 text-[11px] text-muted-foreground">
      注入位置
      <select
        class="h-7 rounded-sm border border-input bg-background px-2 text-xs text-foreground outline-none ring-ring focus:ring-1"
        :value="props.config.injectionPosition"
        @change="update({ injectionPosition: ($event.target as HTMLSelectElement).value as RuleHtmlScriptInjectorActionConfig['injectionPosition'] })"
      >
        <option value="head">head（头部）</option>
        <option value="body-start">body-start（正文开始）</option>
        <option value="body-end">body-end（正文结束）</option>
      </select>
    </label>
  </div>
</template>
