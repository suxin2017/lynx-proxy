<script setup lang="ts">
import type { KeyValueRow } from './types'

import { FluidField } from '@/components/ui/fluid-field'
import { composeGhostButtonSmClass, composeHintTextClass } from './compose-styles'

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
  <div class="flex h-full min-h-0 flex-1 flex-col gap-2">
    <div v-if="props.rows.length === 0" :class="['px-1 py-2', composeHintTextClass]">
      暂无内容
    </div>

    <div v-else class="relative min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain">
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
        <FluidField
          :model-value="row.key"
          :min-expanded-px="64"
          :max-expanded-px="160"
          :placeholder="props.keyPlaceholder ?? 'Key'"
          @update:model-value="updateRow(index, { key: $event })"
        />
        <FluidField
          :model-value="row.value"
          :min-expanded-px="64"
          :max-expanded-px="160"
          :placeholder="props.valuePlaceholder ?? 'Value'"
          @update:model-value="updateRow(index, { value: $event })"
        />
        <button type="button" :class="composeGhostButtonSmClass" @click="removeRow(index)">
          删除
        </button>
      </div>
    </div>
  </div>
</template>
