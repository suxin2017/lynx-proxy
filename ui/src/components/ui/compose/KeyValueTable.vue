<script setup lang="ts">
import type { KeyValueRow } from './types'

import { composeFieldClass, composeGhostButtonClass, composeHintTextClass } from './compose-styles'

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

function addRow() {
  updateRows([...props.rows, { key: '', value: '', enabled: true }])
}

function removeRow(index: number) {
  updateRows(props.rows.filter((_, idx) => idx !== index))
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-2">
    <div class="flex items-center justify-between">
      <span class="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">
        <slot name="title">参数</slot>
      </span>
      <button type="button" :class="composeGhostButtonClass" @click="addRow">
        + 添加
      </button>
    </div>

    <div v-if="props.rows.length === 0" :class="['px-1 py-2', composeHintTextClass]">
      暂无条目，点击「添加」创建。
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
        <button type="button" :class="composeGhostButtonClass" @click="removeRow(index)">
          删除
        </button>
      </div>
    </div>
  </div>
</template>
