<script setup lang="ts">
import { ref, watch } from 'vue'

import {
  composeErrorTextClass,
  composeFieldClass,
  composeGhostButtonClass,
  composePrimaryButtonClass,
} from './compose-styles'

const props = defineProps<{
  open: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  confirm: [curlText: string]
  cancel: []
}>()

const curlText = ref('')

const placeholder = [
  'curl -X POST https://api.example.com/users',
  "-H 'Content-Type: application/json'",
  "-d '{\"name\":\"demo\"}'",
].join(' ')

watch(() => props.open, (open) => {
  if (!open) {
    curlText.value = ''
  }
})

function close() {
  emit('update:open', false)
  emit('cancel')
}

function confirm() {
  emit('confirm', curlText.value)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="close"
    >
      <div
        class="flex w-full max-w-2xl flex-col gap-3 rounded-lg bg-card p-4 shadow-xl ring-1 ring-border/60"
        role="dialog"
        aria-modal="true"
        aria-labelledby="curl-import-title"
      >
        <header>
          <h2 id="curl-import-title" class="text-sm font-semibold text-foreground">
            从 cURL 导入
          </h2>
          <p class="mt-1 text-xs text-muted-foreground">
            粘贴 cURL 命令，将解析为请求草稿。
          </p>
        </header>

        <textarea
          v-model="curlText"
          rows="10"
          :class="[composeFieldClass, 'min-h-[12rem] resize-y font-mono text-[11px]']"
          :placeholder="placeholder"
        />

        <p v-if="props.error" :class="composeErrorTextClass">
          {{ props.error }}
        </p>

        <footer class="flex justify-end gap-2">
          <button type="button" :class="composeGhostButtonClass" @click="close">
            取消
          </button>
          <button
            type="button"
            :class="composePrimaryButtonClass"
            :disabled="!curlText.trim()"
            @click="confirm"
          >
            导入
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>
