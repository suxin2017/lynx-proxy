<script setup lang="ts">
import { AlignLeft, Route } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'

import { Button } from '@/components/ui/button'
import DslEditor from '@/components/ui/dsl-editor/DslEditor.vue'
import { ensureDslWasm, isDslWasmLoaded } from '@/components/ui/dsl-editor/dslWasm'
import {
  canFormatDsl,
  isDslFormatted,
  validateDslDocument,
} from '@/components/ui/dsl-editor/formatDsl'

import { getMatchDslValidationErrors } from './match-validation'

interface MatchDslEditorProps {
  modelValue: string
}

const props = defineProps<MatchDslEditorProps>()
const emit = defineEmits<{
  'update:modelValue': [next: string]
}>()

const wasmReady = ref(isDslWasmLoaded())

onMounted(async () => {
  if (wasmReady.value) {
    return
  }

  try {
    await ensureDslWasm()
    wasmReady.value = true
  }
  catch {
    // Format stays hidden until WASM is available.
  }
})

const validationErrors = computed(() => getMatchDslValidationErrors(props.modelValue))
const canFormat = computed(() => wasmReady.value && canFormatDsl(props.modelValue))
const isFormatted = computed(() => wasmReady.value && isDslFormatted(props.modelValue))
const showFormatButton = computed(() => wasmReady.value && canFormatDsl(props.modelValue))

function handleFormat() {
  if (!canFormat.value || isFormatted.value) {
    return
  }

  const { formattedValue } = validateDslDocument(props.modelValue)
  if (formattedValue) {
    emit('update:modelValue', formattedValue)
  }
}
</script>

<template>
  <article class="min-w-0 rounded-lg bg-muted/25 p-3.5">
    <header class="mb-2 flex items-center gap-2">
      <h3 class="flex min-w-0 items-center gap-2 text-xs font-semibold text-foreground">
        <Route class="h-3.5 w-3.5 shrink-0 text-primary" />
        匹配目标
      </h3>
      <p
        v-if="validationErrors.length > 0"
        class="min-w-0 truncate text-[11px] text-destructive"
      >
        {{ validationErrors.join('；') }}
      </p>
      <Button
        v-if="showFormatButton"
        type="button"
        variant="ghost"
        size="sm"
        class="ml-auto h-7 shrink-0 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-45"
        :disabled="isFormatted"
        aria-label="格式化 DSL"
        title="格式化"
        @click="handleFormat"
      >
        <AlignLeft class="size-3" />
        格式化
      </Button>
    </header>

    <DslEditor
      :model-value="props.modelValue"
      compact
      :show-format="false"
      class="rounded-md bg-background/95 ring-1 ring-border/30"
      @update:model-value="emit('update:modelValue', $event)"
    />
  </article>
</template>
