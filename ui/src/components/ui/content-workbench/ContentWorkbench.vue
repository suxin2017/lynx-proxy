<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { WorkbenchType } from './utils'

import { Check, Copy } from '@lucide/vue'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import CodeMirrorSurface from './CodeMirrorSurface.vue'
import PreviewRenderer from './PreviewRenderer.vue'
import {
  normalizeWorkbenchContent,
  resolveWorkbenchLanguage,
  resolveWorkbenchSurface,
  workbenchTypeUsesSoftWrap,
} from './utils'

interface Props {
  title?: string
  type: WorkbenchType
  content: unknown
  language?: string
  showLineNumbers?: boolean
  showCopy?: boolean
  frameless?: boolean
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  showCopy: true,
  frameless: false,
})

const copyState = ref<'idle' | 'copied' | 'failed'>('idle')
let copyStateTimer: ReturnType<typeof setTimeout> | null = null

const normalized = computed(() => normalizeWorkbenchContent({
  type: props.type,
  content: props.content,
}))

const surface = computed(() => resolveWorkbenchSurface({
  type: props.type,
  content: normalized.value.displayValue,
}))

const language = computed(() => resolveWorkbenchLanguage({
  type: props.type,
  language: props.language,
}))

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
  const content = normalized.value.displayValue
  if (!content) {
    copyState.value = 'failed'
    scheduleCopyStateReset()
    return
  }

  try {
    if (!globalThis.navigator?.clipboard?.writeText) {
      throw new Error('Clipboard API is unavailable')
    }

    await globalThis.navigator.clipboard.writeText(content)
    copyState.value = 'copied'
  }
  catch {
    copyState.value = 'failed'
  }

  scheduleCopyStateReset()
}

watch(() => normalized.value.displayValue, () => {
  resetCopyState()
})

onBeforeUnmount(() => {
  if (copyStateTimer) {
    clearTimeout(copyStateTimer)
  }
})
</script>

<template>
  <section :class="cn(
    'flex min-h-0 flex-col overflow-hidden bg-transparent',
    props.frameless ? '' : 'rounded border border-border/70',
    props.class,
  )">
    <header :class="cn(
      'flex items-center justify-between',
      props.frameless ? 'min-h-5 px-2 py-0' : 'px-2 py-1.5',
    )">
      <div class="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{{ type }}</div>

      <div class="flex items-center gap-1.5">
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

    <div :class="cn(
      'relative min-h-0 flex-1 overflow-hidden',
      props.frameless ? 'p-0' : 'px-1 pb-1',
    )">
      <PreviewRenderer
        v-if="surface === 'preview'"
        :content="normalized.displayValue"
        :has-formatting-error="normalized.hasFormattingError"
      />

      <CodeMirrorSurface
        v-else
        :content="normalized.displayValue"
        :language="language"
        :show-line-numbers="props.showLineNumbers ?? true"
        :soft-wrap="workbenchTypeUsesSoftWrap(props.type)"
        :compact="props.frameless"
      />
    </div>
  </section>
</template>