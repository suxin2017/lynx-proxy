<script setup lang="ts">
import type { HTMLAttributes } from 'vue'

import { Check, Copy } from '@lucide/vue'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import EditableCodeMirrorSurface from './EditableCodeMirrorSurface.vue'
import {
  canFormatJsonDocument,
  isJsonDocumentFormatted,
  validateJsonDocument,
} from './utils'

interface Props {
  modelValue: string
  title?: string
  readOnly?: boolean
  showLineNumbers?: boolean
  showCopy?: boolean
  showFormat?: boolean
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  readOnly: false,
  showLineNumbers: true,
  showCopy: true,
  showFormat: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const copyState = ref<'idle' | 'copied' | 'failed'>('idle')
let copyStateTimer: ReturnType<typeof setTimeout> | null = null

const validation = computed(() => validateJsonDocument(props.modelValue))
const canFormat = computed(() => props.showFormat && !props.readOnly && canFormatJsonDocument(props.modelValue))
const isFormatted = computed(() => validation.value.isValid && isJsonDocumentFormatted(props.modelValue))
const statusText = computed(() => {
  if (validation.value.isValid) {
    return isFormatted.value ? 'JSON 有效，已格式化' : 'JSON 有效'
  }

  return validation.value.errorMessage ?? 'JSON 无效'
})

function resetCopyState() {
  if (copyStateTimer) {
    clearTimeout(copyStateTimer)
    copyStateTimer = null
  }

  copyState.value = 'idle'
}

function scheduleCopyStateReset() {
  if (copyStateTimer) {
    clearTimeout(copyStateTimer)
  }

  copyStateTimer = setTimeout(() => {
    copyState.value = 'idle'
    copyStateTimer = null
  }, 1600)
}

async function handleCopy() {
  if (!props.modelValue) {
    copyState.value = 'failed'
    scheduleCopyStateReset()
    return
  }

  try {
    if (!globalThis.navigator?.clipboard?.writeText) {
      throw new Error('Clipboard API is unavailable')
    }

    await globalThis.navigator.clipboard.writeText(props.modelValue)
    copyState.value = 'copied'
  }
  catch {
    copyState.value = 'failed'
  }

  scheduleCopyStateReset()
}

function handleFormat() {
  if (!validation.value.formattedValue || props.readOnly) {
    return
  }

  emit('update:modelValue', validation.value.formattedValue)
}

function handleUpdateModelValue(value: string) {
  emit('update:modelValue', value)
}

watch(() => props.modelValue, () => {
  resetCopyState()
})

onBeforeUnmount(() => {
  if (copyStateTimer) {
    clearTimeout(copyStateTimer)
  }
})
</script>

<template>
  <section :class="cn('overflow-hidden rounded border border-border/70 bg-transparent', props.class)">
    <header class="flex items-center justify-between gap-2 px-2 py-1.5">
      <div class="flex min-w-0 items-center gap-2">
        <div v-if="props.title" class="truncate text-xs font-medium text-foreground">
          {{ props.title }}
        </div>
        <div class="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">json</div>
      </div>

      <div class="flex items-center gap-1.5">
        <Button
          v-if="props.showFormat"
          type="button"
          variant="ghost"
          size="sm"
          class="h-5 px-1 text-[10px] text-muted-foreground hover:text-foreground disabled:text-muted-foreground/60"
          :disabled="!canFormat || isFormatted"
          @click="handleFormat"
        >
          <span>格式化</span>
        </Button>

        <Button
          v-if="props.showCopy"
          type="button"
          variant="ghost"
          size="sm"
          class="h-5 gap-1 px-1 text-[10px] text-muted-foreground hover:text-foreground"
          @click="handleCopy"
        >
          <Check v-if="copyState === 'copied'" class="size-3" />
          <Copy v-else class="size-3" />
          <span>{{ copyState === 'copied' ? '已复制' : copyState === 'failed' ? '复制失败' : '复制' }}</span>
        </Button>
      </div>
    </header>

    <div class="border-t border-border/50 px-3 py-1 text-[11px]">
      <span :class="validation.isValid ? 'text-muted-foreground' : 'text-destructive'">{{ statusText }}</span>
      <span v-if="props.readOnly" class="ml-2 text-muted-foreground">只读</span>
    </div>

    <div class="relative overflow-hidden px-1 pb-1">
      <EditableCodeMirrorSurface
        :model-value="props.modelValue"
        language="json"
        :read-only="props.readOnly"
        :show-line-numbers="props.showLineNumbers"
        @update:model-value="handleUpdateModelValue"
      />
    </div>
  </section>
</template>
