<script setup lang="ts">
import { PencilLine, Save } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import EditorModeTabs from '@/components/ui/rule-workbench/EditorModeTabs.vue'
import { drawerToolbarInputClass } from './drawer-styles'
import type { RuleDraft, RuleEditorMode } from '@/components/ui/rule-workbench'

const props = withDefaults(defineProps<{
  draft?: RuleDraft
  editorMode: RuleEditorMode
  saving?: boolean
  saveDisabled?: boolean
}>(), {
  saving: false,
  saveDisabled: false,
})

const emit = defineEmits<{
  'update:draft': [draft: RuleDraft]
  'update:editorMode': [mode: RuleEditorMode]
  save: []
}>()

function patchDraft(patch: Partial<RuleDraft>) {
  if (!props.draft) return
  emit('update:draft', { ...props.draft, ...patch })
}
</script>

<template>
  <div class="flex min-w-0 flex-wrap items-center gap-2 border-b border-border px-2 py-2">
    <label class="relative min-w-[10rem] max-w-[min(42%,20rem)] shrink-0">
      <span class="sr-only">规则名称</span>
      <PencilLine
        class="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        type="text"
        :disabled="!props.draft"
        :class="[
          drawerToolbarInputClass,
          'h-8 w-full truncate pl-7 pr-2 disabled:cursor-not-allowed disabled:opacity-50',
        ]"
        :value="props.draft?.name ?? ''"
        placeholder="输入规则名称"
        @input="patchDraft({ name: ($event.target as HTMLInputElement).value })"
      >
    </label>

    <Switch
      :disabled="!props.draft"
      :checked="props.draft?.enabled ?? false"
      :aria-label="props.draft?.enabled ? '禁用规则' : '启用规则'"
      @update:checked="patchDraft({ enabled: $event })"
    />

    <div class="min-w-2 flex-1" aria-hidden="true" />

    <EditorModeTabs
      :model-value="props.editorMode"
      @update:model-value="emit('update:editorMode', $event)"
    />

    <Button
      size="default"
      class="h-8 shrink-0 px-3 text-xs"
      :disabled="props.saveDisabled"
      @click="emit('save')"
    >
      <Save class="h-3.5 w-3.5" />
      {{ props.saving ? '保存中...' : '保存' }}
    </Button>
  </div>
</template>
