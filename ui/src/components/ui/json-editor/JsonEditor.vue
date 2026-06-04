<script setup lang="ts">
import type { HTMLAttributes } from 'vue'

import { AlignLeft, Check, Copy } from '@lucide/vue'
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
  /** Minimal chrome: no title/language badge; icon-only actions; status only when invalid */
  compact?: boolean
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  readOnly: false,
  showLineNumbers: true,
  showCopy: true,
  showFormat: true,
  compact: false,
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
    if (props.compact) return ''
    return isFormatted.value ? 'JSON 有效，已格式化' : 'JSON 有效'
  }

  return validation.value.errorMessage ?? 'JSON 无效'
})

const showStatusBar = computed(() => {
  if (props.compact) {
    return !validation.value.isValid || props.readOnly
  }
  return true
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
  <section :class="cn('min-w-0 overflow-hidden rounded border border-border/70 bg-transparent', props.class)">
    <header
      class="flex items-center gap-2 px-2 py-1"
      :class="props.compact ? 'justify-end' : 'justify-between'"
    >
      <div v-if="!props.compact" class="flex min-w-0 items-center gap-2">
        <div v-if="props.title" class="truncate text-xs font-medium text-foreground">
          {{ props.title }}
        </div>
        <div class="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">json</div>
      </div>

      <div class="flex items-center gap-0.5">
        <Button
          v-if="props.showFormat"
          type="button"
          variant="ghost"
          size="icon-sm"
          class="h-7 w-7 text-muted-foreground hover:text-foreground disabled:text-muted-foreground/60"
          :disabled="!canFormat || isFormatted"
          aria-label="格式化 JSON"
          title="格式化"
          @click="handleFormat"
        >
          <AlignLeft class="size-3.5" />
        </Button>

        <Button
          v-if="props.showCopy"
          type="button"
          variant="ghost"
          size="icon-sm"
          class="h-7 w-7 text-muted-foreground hover:text-foreground"
          :aria-label="copyState === 'copied' ? '已复制' : '复制'"
          :title="copyState === 'copied' ? '已复制' : '复制'"
          @click="handleCopy"
        >
          <Check v-if="copyState === 'copied'" class="size-3.5" />
          <Copy v-else class="size-3.5" />
        </Button>
      </div>
    </header>

    <div
      v-if="showStatusBar && (statusText || props.readOnly)"
      class="border-t border-border/50 px-3 py-1 text-[11px]"
    >
      <span v-if="statusText" :class="validation.isValid ? 'text-muted-foreground' : 'text-destructive'">{{ statusText }}</span>
      <span v-if="props.readOnly" :class="statusText ? 'ml-2 text-muted-foreground' : 'text-muted-foreground'">只读</span>
    </div>

    <div class="relative min-w-0 overflow-x-hidden overflow-y-hidden px-1 pb-1">
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
