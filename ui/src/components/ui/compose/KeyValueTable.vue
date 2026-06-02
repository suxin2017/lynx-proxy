<script setup lang="ts">
import type { KeyValueRow } from './types'

import { composeFieldClass, composeGhostButtonSmClass, composeHintTextClass } from './compose-styles'

const props = defineProps<{
  rows: KeyValueRow[]
  keyPlaceholder?: string
  valuePlaceholder?: string
}>()

const emit = defineEmits<{
  'update:rows': [rows: KeyValueRow[]]
}>()

function updateRows(next: KeyValueRow[]) {
  emit('update:rows', next)
}

function updateRow(index: number, partial: Partial<KeyValueRow>) {
  updateRows(props.rows.map((row, idx) => idx === index ? { ...row, ...partial } : row))
}

function removeRow(index: number) {
  updateRows(props.rows.filter((_, idx) => idx !== index))
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-2">
    <div v-if="props.rows.length === 0" :class="['px-1 py-2', composeHintTextClass]">
      暂无内容
    </div>

    <div v-else class="min-h-0 flex-1 space-y-1.5 overflow-auto">
      <div
        v-for="(row, index) in props.rows"
        :key="`kv-${index}`"
        class="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-1.5"
      >
        <input
          type="checkbox"
          class="size-3.5 rounded-sm accent-primary"
          :checked="row.enabled"
          @change="updateRow(index, { enabled: ($event.target as HTMLInputElement).checked })"
        >
        <input
          :class="composeFieldClass"
          :value="row.key"
          :placeholder="props.keyPlaceholder ?? 'Key'"
          @input="updateRow(index, { key: ($event.target as HTMLInputElement).value })"
        >
        <input
          :class="composeFieldClass"
          :value="row.value"
          :placeholder="props.valuePlaceholder ?? 'Value'"
          @input="updateRow(index, { value: ($event.target as HTMLInputElement).value })"
        >
        <button type="button" :class="composeGhostButtonSmClass" @click="removeRow(index)">
          删除
        </button>
      </div>
    </div>
  </div>
</template>
