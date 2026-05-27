<script setup lang="ts">
import { ref, watch } from 'vue'
import { Plus, Trash2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type { DomainFilter } from '@/lib/http/settings-types'
import { DEFAULT_DOMAIN_FILTER } from '@/lib/http/settings-types'
import {
  settingsFieldClass,
  settingsLabelClass,
  settingsMonoFieldClass,
  settingsRowGridClass,
} from './settings-styles'

const props = defineProps<{
  modelValue: DomainFilter[]
  label: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: DomainFilter[]]
}>()

const rowKeys = ref<string[]>([])

function nextRowKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function syncRowKeys(targetLength: number) {
  if (targetLength > rowKeys.value.length) {
    while (rowKeys.value.length < targetLength) {
      rowKeys.value.push(nextRowKey())
    }
    return
  }

  if (targetLength < rowKeys.value.length) {
    rowKeys.value.splice(targetLength)
  }
}

syncRowKeys(props.modelValue.length)

watch(
  () => props.modelValue.length,
  (length) => {
    syncRowKeys(length)
  },
)

function updateRow(index: number, patch: Partial<DomainFilter>) {
  const next = props.modelValue.map((row, i) => (
    i === index ? { ...row, ...patch } : row
  ))
  emit('update:modelValue', next)
}

function onDomainInput(index: number, event: Event) {
  updateRow(index, { domain: (event.target as HTMLInputElement).value })
}

function onPortInput(index: number, event: Event) {
  updateRow(index, { port: Number((event.target as HTMLInputElement).value) })
}

function addRow() {
  emit('update:modelValue', [...props.modelValue, { ...DEFAULT_DOMAIN_FILTER }])
}

function removeRow(index: number) {
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== index))
}
</script>

<template>
  <div :class="settingsRowGridClass">
    <span :class="settingsLabelClass">{{ props.label }}</span>
    <div class="min-w-0 space-y-1">
      <div class="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="default"
          class="h-6 gap-1 px-1.5 text-[11px]"
          @click="addRow"
        >
          <Plus class="h-3 w-3" />
          添加
        </Button>
      </div>

      <div
        v-for="(row, index) in props.modelValue"
        :key="rowKeys[index]"
        class="grid grid-cols-[auto_minmax(0,1fr)_2.75rem_auto] items-center gap-1.5"
      >
        <Switch
          :checked="row.enabled"
          @update:checked="updateRow(index, { enabled: $event })"
        />
        <input
          type="text"
          :class="settingsFieldClass"
          placeholder="*.example.com"
          :value="row.domain"
          @input="onDomainInput(index, $event)"
        >
        <input
          type="number"
          min="0"
          max="65535"
          :class="cn(settingsMonoFieldClass, 'w-full px-0.5 text-center')"
          :value="row.port"
          @input="onPortInput(index, $event)"
        >
        <Button
          size="icon-sm"
          variant="ghost"
          type="button"
          class="size-6 shrink-0"
          title="删除"
          @click="removeRow(index)"
        >
          <Trash2 class="h-3 w-3 text-muted-foreground/70" />
        </Button>
      </div>
    </div>
  </div>
</template>
