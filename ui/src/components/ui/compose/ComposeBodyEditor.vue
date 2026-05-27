<script setup lang="ts">
import type { KeyValueRow } from './types'
import type { WorkbenchLanguage } from '@/components/ui/content-workbench/utils'

import { computed } from 'vue'

import EditableCodeMirrorSurface from '@/components/ui/json-editor/EditableCodeMirrorSurface.vue'
import { validateJsonDocument } from '@/components/ui/json-editor/utils'

import { composeGhostButtonClass, composePanelInsetClass } from './compose-styles'

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

const language = computed<WorkbenchLanguage>(() => {
  if (contentType.value.includes('application/json')) {
    return 'json'
  }
  return 'plaintext'
})

const showFormat = computed(() => language.value === 'json')

function formatJson() {
  const result = validateJsonDocument(props.body)
  if (result.formattedValue) {
    emit('update:body', result.formattedValue)
  }
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div v-if="showFormat" class="flex justify-end px-1 py-0.5">
      <button type="button" :class="composeGhostButtonClass" @click="formatJson">
        格式化 JSON
      </button>
    </div>
    <div class="h-full min-h-[12rem] overflow-hidden rounded-sm" :class="composePanelInsetClass">
      <EditableCodeMirrorSurface
        :model-value="props.body"
        :language="language"
        :show-line-numbers="true"
        @update:model-value="emit('update:body', $event)"
      />
    </div>
  </div>
</template>
