<script setup lang="ts">
import type { Extension } from '@codemirror/state'
import type { HTMLAttributes } from 'vue'

import { AlignLeft } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import EditableCodeMirrorSurface from '../json-editor/EditableCodeMirrorSurface.vue'
import { dslLanguageExtension } from './dslLanguage'
import { dslAutocompleteExtension } from './dslCompletion'
import { dslLintExtension } from './dslLint'
import { ensureDslWasm, isDslWasmLoaded } from './dslWasm'
import {
  canFormatDsl,
  isDslFormatted,
  validateDslDocument,
} from './formatDsl'

interface Props {
  modelValue: string
  readOnly?: boolean
  compact?: boolean
  resizable?: boolean
  showLineNumbers?: boolean
  showFormat?: boolean
  showStatus?: boolean
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  readOnly: false,
  compact: false,
  resizable: undefined,
  showLineNumbers: true,
  showFormat: true,
  showStatus: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const wasmReady = ref(isDslWasmLoaded())
const wasmError = ref<string | null>(null)

onMounted(async () => {
  if (wasmReady.value) {
    return
  }

  try {
    await ensureDslWasm()
    wasmReady.value = true
  }
  catch (error) {
    wasmError.value = error instanceof Error ? error.message : 'Failed to load DSL WASM'
  }
})

const extensions = computed<Extension>(() => ([
  dslAutocompleteExtension,
  dslLintExtension,
]))

const validation = computed(() => {
  if (!wasmReady.value) {
    return { isValid: false, formattedValue: null as string | null }
  }
  return validateDslDocument(props.modelValue)
})
const showLineNumbersLocal = computed(() => (
  props.compact ? false : props.showLineNumbers
))
const showStatusLocal = computed(() => (
  props.compact ? false : props.showStatus
))
const showToolbar = computed(() => (
  showStatusLocal.value
  || (props.showFormat && !props.readOnly && !props.compact)
  || wasmError.value
  || !wasmReady.value
))
const isResizable = computed(() => props.resizable ?? props.compact)

const canFormat = computed(() => wasmReady.value && props.showFormat && !props.readOnly && canFormatDsl(props.modelValue))
const isFormatted = computed(() => validation.value.isValid && isDslFormatted(props.modelValue))
const statusText = computed(() => {
  if (wasmError.value) {
    return 'DSL 引擎加载失败'
  }
  if (!wasmReady.value) {
    return 'DSL 引擎加载中…'
  }
  if (validation.value.isValid) {
    return isFormatted.value ? 'DSL 有效，已格式化' : 'DSL 有效'
  }
  return 'DSL 无效'
})

function handleFormat() {
  if (!validation.value.formattedValue || props.readOnly) {
    return
  }

  emit('update:modelValue', validation.value.formattedValue)
}

function handleUpdateModelValue(value: string) {
  emit('update:modelValue', value)
}
</script>

<template>
  <section
    :class="cn(
      'min-w-0 bg-transparent',
      props.compact ? 'rounded-md' : 'overflow-hidden rounded border border-border/70',
      props.class,
    )"
  >
    <header
      v-if="showToolbar"
      class="flex items-center justify-between gap-2 px-2 py-1"
    >
      <div v-if="showStatusLocal || wasmError || !wasmReady" class="min-w-0 text-[11px]">
        <span :class="validation.isValid && wasmReady ? 'text-muted-foreground' : 'text-destructive'">{{ statusText }}</span>
        <span v-if="props.readOnly" class="ml-2 text-muted-foreground">只读</span>
      </div>
      <div v-else aria-hidden="true" class="min-w-0 flex-1" />

      <div class="flex shrink-0 items-center gap-0.5">
        <Button
          v-if="props.showFormat && !props.readOnly && !props.compact"
          type="button"
          variant="ghost"
          size="icon-sm"
          class="h-7 w-7 text-muted-foreground hover:text-foreground disabled:text-muted-foreground/60"
          :disabled="!canFormat || isFormatted"
          aria-label="格式化 DSL"
          title="格式化"
          @click="handleFormat"
        >
          <AlignLeft class="size-3.5" />
        </Button>
      </div>
    </header>

    <div
      :class="cn(
        'relative min-w-0',
        isResizable
          ? 'h-[120px] min-h-[120px] max-h-[min(60vh,28rem)] resize-y overflow-auto'
          : 'overflow-x-hidden overflow-y-hidden',
        props.compact ? 'px-0 pb-0' : 'px-1 pb-1',
      )"
    >
      <EditableCodeMirrorSurface
        :key="wasmReady ? 'dsl-wasm' : 'dsl-loading'"
        :model-value="props.modelValue"
        :language-extension="wasmReady ? dslLanguageExtension : []"
        :extensions="wasmReady ? extensions : []"
        :read-only="props.readOnly"
        :show-line-numbers="showLineNumbersLocal"
        :fill-height="isResizable"
        @update:model-value="handleUpdateModelValue"
      />
    </div>
  </section>
</template>
