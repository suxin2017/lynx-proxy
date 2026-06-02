<script setup lang="ts">
import type { Extension } from '@codemirror/state'
import type { HTMLAttributes } from 'vue'

import { EditorState, Prec } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { Clock, ListFilter, TriangleAlert } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'

import { cn } from '@/lib/utils'
import EditableCodeMirrorSurface from '@/components/ui/json-editor/EditableCodeMirrorSurface.vue'
import { dslAutocompleteExtension } from '@/components/ui/dsl-editor/dslCompletion'
import { dslLanguageExtension } from '@/components/ui/dsl-editor/dslLanguage'
import { ensureDslWasm, isDslWasmLoaded } from '@/components/ui/dsl-editor/dslWasm'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

import type { TrafficFilterState } from '@/composables/useTrafficMatchFilter'

const props = withDefaults(defineProps<{
  modelValue: string
  filterState?: TrafficFilterState
  filterError?: string
  history?: string[]
  class?: HTMLAttributes['class']
}>(), {
  filterState: 'idle',
  filterError: undefined,
  history: () => [],
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  submit: [value: string]
  'clear-history': []
}>()

function submitFromEditor(view: EditorView) {
  const value = view.state.doc.toString()
  emit('update:modelValue', value)
  emit('submit', value)
}

function submitFromHistory(value: string) {
  emit('update:modelValue', value)
  emit('submit', value)
}

const submitOnEnterExtension: Extension = Prec.highest([
  keymap.of([
    {
      key: 'Enter',
      run: (view) => {
        submitFromEditor(view)
        return true
      },
    },
  ]),
  EditorView.domEventHandlers({
    keydown(event, view) {
      if (event.key !== 'Enter' || event.shiftKey || event.isComposing) {
        return false
      }

      event.preventDefault()
      submitFromEditor(view)
      return true
    },
  }),
])

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
    wasmReady.value = false
  }
})

const singleLineExtension: Extension = [
  EditorState.transactionFilter.of((transaction) => {
    if (!transaction.docChanged) {
      return transaction
    }

    if (transaction.newDoc.lines > 1) {
      return []
    }

    return transaction
  }),
  EditorView.theme({
    '&': {
      height: '100%',
      fontSize: '0.75rem',
    },
    '.cm-scroller': {
      overflow: 'hidden',
      lineHeight: '1.75rem',
      fontFamily: 'var(--font-mono)',
    },
    '.cm-content': {
      padding: '0 0.25rem',
      minHeight: '1.75rem',
      caretColor: 'var(--color-foreground)',
    },
    '.cm-line': {
      padding: 0,
      lineHeight: '1.75rem',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: 'var(--color-foreground)',
    },
    '&.cm-focused': {
      outline: 'none',
    },
  }),
]

const extensions = computed<Extension>(() => ([
  ...(wasmReady.value
    ? [dslAutocompleteExtension]
    : []),
  submitOnEnterExtension,
  singleLineExtension,
]))

const shellClass = computed(() => cn(
  'relative flex h-7 min-w-[240px] max-w-[360px] flex-1 items-stretch rounded-sm pl-7 pr-12 text-xs text-foreground outline-none transition-colors',
  'bg-muted/55 hover:bg-muted/65 focus-within:bg-muted/70',
  props.filterState === 'invalid' && props.modelValue.trim()
    ? 'bg-amber-500/12'
    : undefined,
  props.class,
))

const iconClass = computed(() => cn(
  'pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2',
  props.filterState === 'invalid' && props.modelValue.trim()
    ? 'text-amber-500'
    : 'text-muted-foreground',
))

const errorIconClass = computed(() => cn(
  'absolute right-7 top-1/2 h-3.5 w-3.5 -translate-y-1/2',
  'text-destructive',
))

const shouldShowErrorIcon = computed(() => {
  return props.filterState === 'invalid' && Boolean(props.modelValue.trim()) && Boolean(props.filterError?.trim())
})
</script>

<template>
  <Popover>
    <div :class="shellClass">
      <ListFilter :class="iconClass" />

      <span
        v-if="!modelValue.trim()"
        class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-7 text-muted-foreground/55"
      >
        example.com，回车过滤
      </span>

      <div class="relative h-full min-w-0 flex-1 overflow-hidden">
        <EditableCodeMirrorSurface
          :model-value="modelValue"
          :language-extension="wasmReady ? dslLanguageExtension : []"
          :extensions="extensions"
          :show-line-numbers="false"
          class="traffic-filter-editor h-full min-w-0"
          @update:model-value="emit('update:modelValue', $event)"
        />
      </div>

      <PopoverTrigger as-child>
        <button
          type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground/70 hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          title="过滤历史"
          aria-label="过滤历史"
        >
          <Clock class="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>

      <TriangleAlert
        v-if="shouldShowErrorIcon"
        :class="errorIconClass"
        :title="filterError"
        aria-label="DSL error"
      />
    </div>

    <PopoverContent
      align="end"
      side="bottom"
      class="w-[360px] p-2"
    >
      <div class="flex items-center justify-between px-1 py-1">
        <div class="text-xs font-medium text-foreground/85">
          历史过滤
        </div>
        <button
          type="button"
          class="rounded-sm px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          :disabled="(history?.length ?? 0) === 0"
          @click="emit('clear-history')"
        >
          清空
        </button>
      </div>

      <div class="max-h-64 overflow-auto py-1">
        <div
          v-if="(history?.length ?? 0) === 0"
          class="px-2 py-2 text-xs text-muted-foreground"
        >
          暂无历史
        </div>

        <button
          v-for="item in history"
          :key="item"
          type="button"
          class="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-xs text-foreground/90 hover:bg-muted/60"
          @click="submitFromHistory(item)"
        >
          <span class="truncate">
            {{ item }}
          </span>
        </button>
      </div>
    </PopoverContent>
  </Popover>
</template>

<style scoped>
:deep(.traffic-filter-editor) {
  height: 100%;
}

:deep(.traffic-filter-editor .cm-editor) {
  height: 100%;
  background: transparent;
  overflow: hidden;
}

:deep(.traffic-filter-editor .cm-scroller) {
  height: 100%;
  overflow: hidden;
  line-height: 1.75rem;
  scrollbar-width: none;
}

:deep(.traffic-filter-editor .cm-scroller::-webkit-scrollbar) {
  display: none;
}

:deep(.traffic-filter-editor .cm-content) {
  padding: 0 !important;
  min-height: 1.75rem;
}

:deep(.traffic-filter-editor .cm-line) {
  line-height: 1.75rem;
}

:deep(.traffic-filter-editor .cm-gutters) {
  display: none;
}

:deep(.traffic-filter-editor .cm-activeLine) {
  background: transparent;
}
</style>
