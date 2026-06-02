<script setup lang="ts">
import type { FormFieldRow } from '@/lib/http/body-formatters'

defineProps<{
  rows: FormFieldRow[]
  emptyLabel?: string
}>()
</script>

<template>
  <section class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
    <div
      v-if="rows.length === 0"
      class="px-5 py-1 text-xs text-muted-foreground"
    >
      {{ emptyLabel ?? '无表单字段' }}
    </div>

    <table
      v-else
      class="w-full table-fixed text-xs"
    >
      <tbody>
        <tr
          v-for="(row, index) in rows"
          :key="`${row.key}-${index}`"
          class="align-top"
        >
          <td class="w-[34%] px-5 py-1 font-mono text-[11px] text-muted-foreground break-all">
            {{ row.key }}
          </td>
          <td class="px-2 py-1 font-mono text-[11px] text-foreground break-all whitespace-pre-wrap">
            {{ row.value }}
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
