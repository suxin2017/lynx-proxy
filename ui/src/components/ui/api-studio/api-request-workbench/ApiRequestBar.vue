<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { ApiRequestDraft } from '../types'
import { Loader2, Play } from '@lucide/vue'
import { COMPOSE_HTTP_METHODS } from '@/components/ui/compose/types'
import { FluidField } from '@/components/ui/fluid-field'
import { cn } from '@/lib/utils'
import {
  apiStudioFieldClass,
  apiStudioPanelPadXClass,
  apiStudioPrimaryButtonClass,
} from '../api-studio-styles'

const props = withDefaults(defineProps<{
  draft: ApiRequestDraft
  loading?: boolean
  compact?: boolean
  showSend?: boolean
  class?: HTMLAttributes['class']
}>(), {
  loading: false,
  compact: false,
  showSend: true,
})

const emit = defineEmits<{
  'update:method': [method: ApiRequestDraft['method']]
  'update:url': [url: string]
  send: []
}>()

function onSend() {
  if (!props.draft.url.trim()) return
  emit('send')
}
</script>

<template>
  <div
    :class="cn(
      'flex min-w-0 shrink-0 items-center gap-2 overflow-hidden pt-3',
      apiStudioPanelPadXClass,
      props.compact ? 'pb-2.5' : 'pb-3',
      props.class,
    )"
  >
    <select
      :class="[apiStudioFieldClass, 'w-[5.5rem] shrink-0 font-mono text-[11px] font-semibold']"
      :value="props.draft.method"
      @change="emit('update:method', ($event.target as HTMLSelectElement).value as ApiRequestDraft['method'])"
    >
      <option v-for="method in COMPOSE_HTTP_METHODS" :key="method" :value="method">
        {{ method }}
      </option>
    </select>

    <FluidField
      :model-value="props.draft.url"
      mono
      class="min-w-0 flex-1"
      placeholder="https://api.example.com/path"
      :max-expanded-px="120"
      @update:model-value="emit('update:url', $event)"
    />

    <button
      v-if="props.showSend"
      type="button"
      :class="[apiStudioPrimaryButtonClass, 'inline-flex items-center justify-center gap-1.5']"
      :disabled="!props.draft.url.trim() || props.loading"
      :aria-busy="props.loading"
      @click="onSend"
    >
      <Loader2
        v-if="props.loading"
        class="size-3.5 shrink-0 animate-spin"
        aria-hidden="true"
      />
      <Play
        v-else
        class="size-3.5 shrink-0 fill-current"
        aria-hidden="true"
      />
      {{ props.loading ? '发送中…' : '发送' }}
    </button>
  </div>
</template>
