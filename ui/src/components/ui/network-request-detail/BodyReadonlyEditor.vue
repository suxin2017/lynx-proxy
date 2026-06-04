<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { WorkbenchLanguage } from '@/components/ui/content-workbench/utils'

import { Check, Copy } from '@lucide/vue'
import { onBeforeUnmount, ref, watch } from 'vue'

import CodeMirrorSurface from '@/components/ui/content-workbench/CodeMirrorSurface.vue'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<{
  content: string
  language: WorkbenchLanguage
  showLineNumbers?: boolean
  softWrap?: boolean
  showCopy?: boolean
  class?: HTMLAttributes['class']
}>(), {
  showLineNumbers: true,
  softWrap: true,
  showCopy: false,
})

const copyState = ref<'idle' | 'copied' | 'failed'>('idle')
let copyStateTimer: ReturnType<typeof setTimeout> | null = null

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
  const content = props.content
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

watch(() => props.content, () => {
  resetCopyState()
})

onBeforeUnmount(() => {
  if (copyStateTimer) {
    clearTimeout(copyStateTimer)
  }
})
</script>

<template>
  <section :class="cn('flex min-h-0 flex-1 flex-col overflow-hidden', props.class)">
    <header
      v-if="props.showCopy"
      class="flex min-h-5 shrink-0 items-center justify-start px-1 py-0"
    >
      <Button
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
    </header>

    <div class="relative min-h-0 flex-1 overflow-hidden">
      <CodeMirrorSurface
        :content="props.content"
        :language="props.language"
        :show-line-numbers="props.showLineNumbers"
        :soft-wrap="props.softWrap"
        compact
      />
    </div>
  </section>
</template>
