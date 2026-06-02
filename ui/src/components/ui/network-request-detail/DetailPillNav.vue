<script setup lang="ts">
interface DetailPillNavProps {
  modelValue: string
  options: Array<{ value: string, label: string }>
}

const props = defineProps<DetailPillNavProps>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <nav class="flex flex-wrap items-center gap-1 px-1 py-0.5">
    <button
      v-for="option in props.options"
      :key="option.value"
      type="button"
      class="h-6 rounded px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
      :class="props.modelValue === option.value ? 'bg-muted text-foreground' : 'hover:bg-muted/40'"
      @click="emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>

    <slot name="actions" />
  </nav>
</template>
