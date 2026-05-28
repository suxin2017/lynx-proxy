<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { FileJson2, Split } from '@lucide/vue'
import { cn } from '@/lib/utils'
type RuleEditorMode = 'visual' | 'dsl'

const props = defineProps<{
  modelValue: RuleEditorMode
  class?: HTMLAttributes['class']
}>()

const emit = defineEmits<{
  'update:modelValue': [mode: RuleEditorMode]
}>()

function setMode(mode: RuleEditorMode) {
  if (mode === props.modelValue) return
  emit('update:modelValue', mode)
}
</script>

<template>
  <div
    role="tablist"
    aria-label="编辑模式"
    :class="cn('inline-flex h-8 shrink-0 items-center rounded-sm bg-muted/40 p-0.5', props.class)"
  >
    <button
      type="button"
      role="tab"
      aria-controls="editor-mode-visual"
      :aria-selected="props.modelValue === 'visual'"
      class="inline-flex h-7 items-center gap-1 rounded-sm px-2 text-[11px] font-medium transition-colors"
      :class="props.modelValue === 'visual'
        ? 'bg-background text-foreground'
        : 'text-muted-foreground hover:text-foreground'"
      @click="setMode('visual')"
    >
      <Split class="h-3.5 w-3.5" />
      可视化
    </button>
    <button
      type="button"
      role="tab"
      aria-controls="editor-mode-dsl"
      :aria-selected="props.modelValue === 'dsl'"
      class="inline-flex h-7 items-center gap-1 rounded-sm px-2 text-[11px] font-medium transition-colors"
      :class="props.modelValue === 'dsl'
        ? 'bg-background text-foreground'
        : 'text-muted-foreground hover:text-foreground'"
      @click="setMode('dsl')"
    >
      <FileJson2 class="h-3.5 w-3.5" />
      DSL
    </button>
  </div>
</template>
