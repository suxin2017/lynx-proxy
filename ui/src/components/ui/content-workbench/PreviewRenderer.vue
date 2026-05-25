<script setup lang="ts">
const props = withDefaults(defineProps<{
  content: string
  hasFormattingError?: boolean
}>(), {
  hasFormattingError: false,
})
</script>

<template>
  <div class="px-2 py-1.5">
    <p
      v-if="props.hasFormattingError"
      class="mb-1.5 text-[11px] text-destructive"
    >
      内容格式化失败，显示原始内容。
    </p>

    <pre class="whitespace-pre-wrap wrap-break-word font-mono text-xs leading-5 text-foreground">{{ props.content }}</pre>
  </div>
</template>