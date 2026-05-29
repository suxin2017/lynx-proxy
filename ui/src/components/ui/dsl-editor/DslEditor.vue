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
  showLineNumbers?: boolean
  showFormat?: boolean
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  readOnly: false,
  showLineNumbers: true,
  showFormat: true,
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
  <section :class="cn('min-w-0 overflow-hidden rounded border border-border/70 bg-transparent', props.class)">
    <header class="flex items-center justify-between gap-2 px-2 py-1">
      <div class="min-w-0 text-[11px]">
        <span :class="validation.isValid && wasmReady ? 'text-muted-foreground' : 'text-destructive'">{{ statusText }}</span>
        <span v-if="props.readOnly" class="ml-2 text-muted-foreground">只读</span>
      </div>

      <div class="flex shrink-0 items-center gap-0.5">
        <Button
          v-if="props.showFormat"
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

    <div class="relative min-w-0 overflow-x-hidden overflow-y-hidden px-1 pb-1">
      <EditableCodeMirrorSurface
        :key="wasmReady ? 'dsl-wasm' : 'dsl-loading'"
        :model-value="props.modelValue"
        :language-extension="wasmReady ? dslLanguageExtension : []"
        :extensions="wasmReady ? extensions : []"
        :read-only="props.readOnly"
        :show-line-numbers="props.showLineNumbers"
        @update:model-value="handleUpdateModelValue"
      />
    </div>
  </section>
</template>
