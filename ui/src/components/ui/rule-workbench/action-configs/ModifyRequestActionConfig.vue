<script setup lang="ts">
import type { RuleModifyRequestActionConfig } from '../types'

interface ModifyRequestActionConfigProps {
  config: RuleModifyRequestActionConfig
}

const props = defineProps<ModifyRequestActionConfigProps>()
const emit = defineEmits<{
  'update:config': [config: RuleModifyRequestActionConfig]
}>()

function update(partial: Partial<RuleModifyRequestActionConfig>) {
  emit('update:config', {
    ...props.config,
    ...partial,
  })
}

function addHeader() {
  update({ modifyHeaders: [...props.config.modifyHeaders, { key: '', value: '' }] })
}

function updateHeader(index: number, key: 'key' | 'value', value: string) {
  const next = props.config.modifyHeaders.map((header, idx) => idx === index ? { ...header, [key]: value } : header)
  update({ modifyHeaders: next })
}

function removeHeader(index: number) {
  update({ modifyHeaders: props.config.modifyHeaders.filter((_, idx) => idx !== index) })
}
</script>

<template>
  <div class="grid gap-2 sm:grid-cols-2">
    <label class="grid gap-1 text-[11px] text-muted-foreground">
      Method
      <select
        class="h-7 rounded-sm border border-input bg-background px-2 text-xs text-foreground outline-none ring-ring focus:ring-1"
        :value="props.config.modifyMethod"
        @change="update({ modifyMethod: ($event.target as HTMLSelectElement).value })"
      >
        <option value="">（不变）</option>
        <option value="GET">GET</option>
        <option value="POST">POST</option>
        <option value="PUT">PUT</option>
        <option value="PATCH">PATCH</option>
        <option value="DELETE">DELETE</option>
      </select>
    </label>

    <label class="grid gap-1 text-[11px] text-muted-foreground">
      URL
      <input
        class="h-7 rounded-sm border border-input bg-background px-2 text-xs text-foreground outline-none ring-ring placeholder:text-muted-foreground focus:ring-1"
        :value="props.config.modifyUrl"
        placeholder="https://example.com/new-path"
        @input="update({ modifyUrl: ($event.target as HTMLInputElement).value })"
      >
    </label>

    <div class="sm:col-span-2 grid gap-1">
      <div class="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Headers</span>
        <button type="button" class="text-primary hover:underline" @click="addHeader">+ 添加 Header</button>
      </div>
      <div v-for="(header, idx) in props.config.modifyHeaders" :key="`req-header-${idx}`" class="grid gap-1 sm:grid-cols-[1fr_1fr_auto]">
        <input
          class="h-7 rounded-sm border border-input bg-background px-2 text-xs text-foreground outline-none ring-ring placeholder:text-muted-foreground focus:ring-1"
          :value="header.key"
          placeholder="Header name"
          @input="updateHeader(idx, 'key', ($event.target as HTMLInputElement).value)"
        >
        <input
          class="h-7 rounded-sm border border-input bg-background px-2 text-xs text-foreground outline-none ring-ring placeholder:text-muted-foreground focus:ring-1"
          :value="header.value"
          placeholder="Header value"
          @input="updateHeader(idx, 'value', ($event.target as HTMLInputElement).value)"
        >
        <button type="button" class="h-7 rounded-sm px-2 text-xs text-muted-foreground hover:text-foreground" @click="removeHeader(idx)">删除</button>
      </div>
    </div>

    <label class="grid gap-1 text-[11px] text-muted-foreground sm:col-span-2">
      Body
      <textarea
        rows="3"
        class="rounded-sm border border-input bg-background px-2 py-1.5 text-xs text-foreground outline-none ring-ring placeholder:text-muted-foreground focus:ring-1"
        :value="props.config.modifyBody"
        @input="update({ modifyBody: ($event.target as HTMLTextAreaElement).value })"
      />
    </label>
  </div>
</template>
