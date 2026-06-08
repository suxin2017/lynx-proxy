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

const props = defineProps<NetworkRequestTableProps>()

const emit = defineEmits<{
  'update:modelValue': [id: string]
  select: [request: TrafficRecord]
  contextMenu: [request: TrafficRecord, ev: MouseEvent]
}>()

const tableData = computed<NetworkTableRow[]>(() => {
  return props.requests as NetworkTableRow[]
})

const selectRequest = (request: TrafficRecord) => {
  emit('update:modelValue', request.id)
  emit('select', request)
}

const handleRowContextMenu = (request: TrafficRecord, _ev: MouseEvent) => {
  // Right-click should also select the row (detail panel follows selection).
  selectRequest(request)
  // The actual menu open is handled by the parent component that wraps NetworkRequestTable.
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
      return h('span', {
        class: cn(cellButtonClass(request), 'block uppercase'),
        title: request.method,
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
      return h('span', {
        class: cn(cellButtonClass(request), 'block'),
        title: request.url,
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
      return h('span', {
        class: cn(
          cellButtonClass(request),
          request.id === props.modelValue ? 'text-primary-foreground' : statusClass(request.status),
          'block capitalize',
        ),
        title: request.status,
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
      return h('span', {
        class: cn(cellButtonClass(request), 'block'),
        title: value,
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
      return h('span', {
        class: cn(cellButtonClass(request), 'block capitalize'),
        title: value,
      }, value)
    },
  },
]
</script>

<template>
  <VirtualTable
    :class="cn('h-full min-h-0 w-full', props.class)"
    :data="tableData"
    :columns="columns"
    :height="props.height"
    :row-height="20"
    :header-height="20"
    :estimate-column-width="160"
    :overscan-rows="12"
    :overscan-columns="4"
    :empty-text="'暂无请求'"
    :get-row-id="(row) => String(row.id)"
    :row-class-name="(row) => rowClassName(row as unknown as NetworkTableRow)"
    follow-scroll-on-append="auto"
    :selected-row-id="props.modelValue"
    @row-click="selectRequest"
    @row-context-menu="(request, ev) => { handleRowContextMenu(request, ev); emit('contextMenu', request, ev) }"
  />
</template>
