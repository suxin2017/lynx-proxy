<script setup lang="ts">
import { computed, h } from 'vue'
import type { HTMLAttributes } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import type { TrafficRecord } from '@/components/ui/request-tree'
import { VirtualTable } from '@/components/ui/virtual-table'
import { cn } from '@/lib/utils'

type NetworkTableRow = TrafficRecord & Record<string, unknown>

interface NetworkRequestTableProps {
  requests: TrafficRecord[]
  modelValue?: string
  height?: number
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<NetworkRequestTableProps>(), {
  height: 520,
})

const emit = defineEmits<{
  'update:modelValue': [id: string]
  select: [request: TrafficRecord]
}>()

const tableData = computed<NetworkTableRow[]>(() => {
  return props.requests as NetworkTableRow[]
})

const selectRequest = (request: TrafficRecord) => {
  emit('update:modelValue', request.id)
  emit('select', request)
}

const statusClass = (status: TrafficRecord['status']) => {
  switch (status) {
    case 'success':
      return 'text-emerald-600'
    case 'error':
      return 'text-red-600'
    case 'cancelled':
      return 'text-amber-600'
    default:
      return 'text-muted-foreground'
  }
}

const cellButtonClass = (request: TrafficRecord) => cn(
  'w-full truncate text-left text-xs',
  request.id === props.modelValue ? 'font-semibold text-primary-foreground' : 'text-foreground',
)

const rowClassName = (row: NetworkTableRow) => {
  const request = row as TrafficRecord
  return request.id === props.modelValue
    ? 'bg-primary hover:bg-primary/90 ring-1 ring-inset ring-primary/70'
    : undefined
}

const columns: ColumnDef<NetworkTableRow, unknown>[] = [
  {
    id: 'method',
    accessorKey: 'method',
    header: 'Method',
    size: 86,
    cell: ({ row }) => {
      const request = row.original as TrafficRecord
      return h('button', {
        type: 'button',
        class: cn(cellButtonClass(request), 'uppercase'),
        title: request.method,
        onClick: () => selectRequest(request),
      }, request.method)
    },
  },
  {
    id: 'url',
    accessorKey: 'url',
    header: 'URL',
    size: 560,
    cell: ({ row }) => {
      const request = row.original as TrafficRecord
      return h('button', {
        type: 'button',
        class: cellButtonClass(request),
        title: request.url,
        onClick: () => selectRequest(request),
      }, request.url)
    },
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: 'Status',
    size: 120,
    cell: ({ row }) => {
      const request = row.original as TrafficRecord
      return h('button', {
        type: 'button',
        class: cn(
          cellButtonClass(request),
          request.id === props.modelValue ? 'text-primary-foreground' : statusClass(request.status),
          'capitalize',
        ),
        title: request.status,
        onClick: () => selectRequest(request),
      }, request.status)
    },
  },
  {
    id: 'statusCode',
    accessorKey: 'statusCode',
    header: 'Status Code',
    size: 132,
    cell: ({ row }) => {
      const request = row.original as TrafficRecord
      const value = request.statusCode !== undefined ? String(request.statusCode) : '-'
      return h('button', {
        type: 'button',
        class: cellButtonClass(request),
        title: value,
        onClick: () => selectRequest(request),
      }, value)
    },
  },
  {
    id: 'requestType',
    accessorKey: 'requestType',
    header: 'Type',
    size: 140,
    cell: ({ row }) => {
      const request = row.original as TrafficRecord
      const value = request.requestType ?? '-'
      return h('button', {
        type: 'button',
        class: cn(cellButtonClass(request), 'capitalize'),
        title: value,
        onClick: () => selectRequest(request),
      }, value)
    },
  },
]
</script>

<template>
  <VirtualTable :class="cn('w-full', props.class)" :data="tableData" :columns="columns" :height="props.height"
    :row-height="20" :header-height="20" :estimate-column-width="160" :overscan-rows="12" :overscan-columns="4"
    :empty-text="'暂无请求'" :get-row-id="(row) => String(row.id)"
    :row-class-name="(row) => rowClassName(row as unknown as NetworkTableRow)" />
</template>
