<script setup lang="ts">
import type { KeyValueRow } from './types'
import type { WorkbenchLanguage } from '@/components/ui/content-workbench/utils'

import { computed } from 'vue'

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

const language = computed<WorkbenchLanguage>(() => {
  if (contentType.value.includes('application/json')) {
    return 'json'
  }
  return 'plaintext'
})

const showFormat = computed(() => language.value === 'json')
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
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
