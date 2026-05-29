<script setup lang="ts">
import type { Extension } from '@codemirror/state'
import type { HTMLAttributes } from 'vue'

import { computed } from 'vue'

import { cn } from '@/lib/utils'

import EditableCodeMirrorSurface from '../json-editor/EditableCodeMirrorSurface.vue'
import { dslLanguageExtension } from './dslLanguage'
import { dslAutocompleteExtension } from './dslCompletion'
import { dslLintExtension } from './dslLint'

interface Props {
  modelValue: string
  readOnly?: boolean
  showLineNumbers?: boolean
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  readOnly: false,
  showLineNumbers: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const extensions = computed<Extension>(() => ([
  dslAutocompleteExtension,
  dslLintExtension,
]))

function handleUpdateModelValue(value: string) {
  emit('update:modelValue', value)
}
</script>

<template>
  <section :class="cn('min-w-0 overflow-hidden rounded border border-border/70 bg-transparent', props.class)">
    <div class="relative min-w-0 overflow-x-hidden overflow-y-hidden px-1 pb-1">
      <EditableCodeMirrorSurface
        :model-value="props.modelValue"
        :language-extension="dslLanguageExtension"
        :extensions="extensions"
        :read-only="props.readOnly"
        :show-line-numbers="props.showLineNumbers"
        @update:model-value="handleUpdateModelValue"
      />
    </div>
  </section>
</template>

