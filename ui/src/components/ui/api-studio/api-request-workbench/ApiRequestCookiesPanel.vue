<script setup lang="ts">
import type { ApiRequestDraft } from '../types'
import KeyValueTable from '@/components/ui/compose/KeyValueTable.vue'

const props = defineProps<{
  draft: ApiRequestDraft
}>()

const emit = defineEmits<{
  'update:draft': [draft: ApiRequestDraft]
}>()
</script>

<template>
  <KeyValueTable
    class="h-full min-h-0"
    :rows="props.draft.cookies"
    key-placeholder="Cookie name"
    value-placeholder="Cookie value"
    @update:rows="emit('update:draft', { ...props.draft, cookies: $event })"
  />
</template>
