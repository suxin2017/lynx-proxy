<script setup lang="ts">
const props = withDefaults(defineProps<{
  content: string
  hasFormattingError?: boolean
}>(), {
  hasFormattingError: false,
})
</script>

<template>
  <div class="px-4 py-3">
    <p
      v-if="props.hasFormattingError"
      class="mb-2 text-xs text-destructive"
    >
      Content formatting failed. Showing raw content.
    </p>

    <pre class="whitespace-pre-wrap break-words font-mono text-sm leading-6 text-foreground">{{ props.content }}</pre>
  </div>
</template>