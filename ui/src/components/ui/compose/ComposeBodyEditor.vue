<script setup lang="ts">
import type { Extension } from '@codemirror/state'
import type { KeyValueRow } from './types'
import type { WorkbenchLanguage } from '@/components/ui/content-workbench/utils'

import { computed } from 'vue'
import { EditorView } from '@codemirror/view'

import EditableCodeMirrorSurface from '@/components/ui/json-editor/EditableCodeMirrorSurface.vue'

import { composePanelInsetClass } from './compose-styles'

const props = defineProps<{
  body: string
  headers: KeyValueRow[]
}>()

const emit = defineEmits<{
  'update:body': [body: string]
}>()

const contentType = computed(() => {
  const row = props.headers.find(
    header => header.enabled && header.key.toLowerCase() === 'content-type',
  )
  return row?.value?.toLowerCase() ?? ''
})

const isValidJsonBody = computed(() => {
  const trimmed = props.body.trim()
  if (!trimmed) return false
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return false
  try {
    JSON.parse(trimmed)
    return true
  } catch {
    return false
  }
})

const isJson = computed(() => {
  const ct = contentType.value
  return ct.includes('application/json') || ct.includes('+json') || isValidJsonBody.value
})

const language = computed<WorkbenchLanguage>(() => (isJson.value ? 'json' : 'plaintext'))

/** Soft-wrap long lines (JSON, plain text) — avoid horizontal scroll in request body. */
const extensions = computed((): Extension[] => [EditorView.lineWrapping])
</script>

<template>
  <div class="flex h-full min-h-0 flex-1 flex-col">
    <div class="min-h-0 flex-1 overflow-hidden rounded-sm" :class="composePanelInsetClass">
      <EditableCodeMirrorSurface
        :model-value="props.body"
        :language="language"
        :extensions="extensions"
        :show-line-numbers="true"
        fill-height
        @update:model-value="emit('update:body', $event)"
      />
    </div>
  </div>
</template>
