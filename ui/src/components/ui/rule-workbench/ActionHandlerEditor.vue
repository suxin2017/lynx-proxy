<script setup lang="ts">
import ActionConfigRenderer from './ActionConfigRenderer.vue'
import {
  actionEditorFieldClass,
  actionEditorLabelClass,
  actionEditorTextareaClass,
  HANDLER_TYPES,
} from './action-editor-styles'
import { changeActionType } from './types'
import type { RuleActionDraft, RuleHandlerType } from './types'

const props = withDefaults(defineProps<{
  modelValue: RuleActionDraft
  showEnabled?: boolean
  showCategory?: boolean
  category?: string
}>(), {
  showEnabled: true,
  showCategory: false,
  category: '',
})

const emit = defineEmits<{
  'update:modelValue': [action: RuleActionDraft]
  'update:category': [category: string]
}>()

function patch(patch: Partial<RuleActionDraft>) {
  emit('update:modelValue', { ...props.modelValue, ...patch } as RuleActionDraft)
}

function updateType(type: RuleHandlerType) {
  emit('update:modelValue', changeActionType(props.modelValue, type))
}
</script>

<template>
  <div class="grid min-w-0 gap-2 sm:grid-cols-2">
    <label :class="actionEditorLabelClass">
      类型
      <select
        :class="actionEditorFieldClass"
        :value="props.modelValue.type"
        @change="updateType(($event.target as HTMLSelectElement).value as RuleHandlerType)"
      >
        <option v-for="handlerType in HANDLER_TYPES" :key="handlerType" :value="handlerType">
          {{ handlerType }}
        </option>
      </select>
    </label>

    <label v-if="props.showEnabled" :class="actionEditorLabelClass">
      启用
      <select
        :class="actionEditorFieldClass"
        :value="props.modelValue.enabled ? 'true' : 'false'"
        @change="patch({ enabled: ($event.target as HTMLSelectElement).value === 'true' })"
      >
        <option value="true">已启用</option>
        <option value="false">已禁用</option>
      </select>
    </label>

    <label v-if="props.showCategory" :class="actionEditorLabelClass">
      分类
      <input
        :class="actionEditorFieldClass"
        :value="props.category"
        @input="emit('update:category', ($event.target as HTMLInputElement).value)"
      >
    </label>

    <label :class="[actionEditorLabelClass, 'sm:col-span-2']">
      名称
      <input
        :class="actionEditorFieldClass"
        :value="props.modelValue.name"
        @input="patch({ name: ($event.target as HTMLInputElement).value })"
      >
    </label>

    <label :class="[actionEditorLabelClass, 'sm:col-span-2']">
      描述
      <textarea
        rows="2"
        :class="actionEditorTextareaClass"
        :value="props.modelValue.description"
        @input="patch({ description: ($event.target as HTMLTextAreaElement).value })"
      />
    </label>

    <div class="sm:col-span-2">
      <ActionConfigRenderer
        :action="props.modelValue"
        @update:action="emit('update:modelValue', $event)"
      />
    </div>
  </div>
</template>
