<script setup lang="ts">
import type { ComposeDraft } from './types'

import { COMPOSE_HTTP_METHODS } from './types'
import {
  composeFieldClass,
  composeMonoFieldClass,
  composePrimaryButtonClass,
} from './compose-styles'

const props = defineProps<{
  draft: ComposeDraft
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:method': [method: ComposeDraft['method']]
  'update:url': [url: string]
  send: []
}>()

function onSend() {
  if (!props.draft.url.trim()) {
    return
  }
  emit('send')
}
</script>

<template>
  <div class="flex min-w-0 items-center gap-1 px-3 pb-2">
    <select
      :class="[composeFieldClass, 'w-[5.5rem] shrink-0 font-mono text-[11px] font-semibold']"
      :value="props.draft.method"
      @change="emit('update:method', ($event.target as HTMLSelectElement).value as ComposeDraft['method'])"
    >
      <option v-for="method in COMPOSE_HTTP_METHODS" :key="method" :value="method">
        {{ method }}
      </option>
    </select>

    <input
      :class="[composeMonoFieldClass, 'min-w-0 flex-1']"
      :value="props.draft.url"
      placeholder="https://api.example.com/path"
      @input="emit('update:url', ($event.target as HTMLInputElement).value)"
    >

    <button
      type="button"
      :class="composePrimaryButtonClass"
      :disabled="!props.draft.url.trim() || props.loading"
      @click="onSend"
    >
      {{ props.loading ? '发送中…' : '发送' }}
    </button>
  </div>
</template>
