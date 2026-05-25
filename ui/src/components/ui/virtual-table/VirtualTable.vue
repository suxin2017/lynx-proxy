<script setup lang="ts" generic="TData extends Record<string, unknown>">
import type { HTMLAttributes } from "vue"
import type { Column, ColumnDef, Row } from "@tanstack/vue-table"
import { computed, ref } from "vue"
import { useVirtualizer } from "@tanstack/vue-virtual"
import { FlexRender, getCoreRowModel, useVueTable } from "@tanstack/vue-table"
import { cn } from "@/lib/utils"

interface VirtualTableProps<TData extends Record<string, unknown>> {
  class?: HTMLAttributes["class"]
  data: TData[]
  columns: ColumnDef<TData, unknown>[]
  height?: number
  rowHeight?: number
  headerHeight?: number
  overscanRows?: number
  overscanColumns?: number
  frozenTopRows?: number
  frozenLeftColumns?: number
  estimateColumnWidth?: number
  emptyText?: string
  getRowId?: (originalRow: TData, index: number, parent?: Row<TData>) => string
  rowClassName?: (row: Row<TData>, rowIndex: number) => HTMLAttributes["class"]
}

const props = withDefaults(defineProps<VirtualTableProps<TData>>(), {
  height: 520,
  rowHeight: 28,
  headerHeight: 30,
  overscanRows: 8,
  overscanColumns: 4,
  frozenTopRows: 0,
  frozenLeftColumns: 0,
  estimateColumnWidth: 160,
  emptyText: "无数据",
})

const scrollContainerRef = ref<HTMLElement | null>(null)

const table = useVueTable({
  get data() {
    return props.data
  },
  get columns() {
    return props.columns
  },
  getCoreRowModel: getCoreRowModel(),
  getRowId: props.getRowId,
})

const allColumns = computed(() => table.getAllLeafColumns())
const allRows = computed(() => table.getRowModel().rows)

const clampedFrozenTopRows = computed(() => Math.min(props.frozenTopRows, allRows.value.length))
const clampedFrozenLeftColumns = computed(() => Math.min(props.frozenLeftColumns, allColumns.value.length))

const frozenRows = computed(() => allRows.value.slice(0, clampedFrozenTopRows.value))
const virtualRowsSource = computed(() => allRows.value.slice(clampedFrozenTopRows.value))

const frozenColumns = computed(() => allColumns.value.slice(0, clampedFrozenLeftColumns.value))
const virtualColumnsSource = computed(() => allColumns.value.slice(clampedFrozenLeftColumns.value))

const frozenRowsHeight = computed(() => frozenRows.value.length * props.rowHeight)
const leafHeaders = computed(() => {
  const groups = table.getHeaderGroups()
  return groups.at(-1)?.headers ?? []
})

const rowVirtualizer = useVirtualizer(computed(() => ({
  count: virtualRowsSource.value.length,
  getScrollElement: () => scrollContainerRef.value,
  estimateSize: () => props.rowHeight,
  overscan: props.overscanRows,
})))

const columnVirtualizer = useVirtualizer(computed(() => ({
  horizontal: true,
  count: virtualColumnsSource.value.length,
  getScrollElement: () => scrollContainerRef.value,
  estimateSize: (index: number) => {
    const column = virtualColumnsSource.value[index]
    if (!column) {
      return props.estimateColumnWidth
    }

    return getColumnWidth(column)
  },
  overscan: props.overscanColumns,
})))

const virtualRowItems = computed(() => rowVirtualizer.value.getVirtualItems())
const virtualColumnItems = computed(() => columnVirtualizer.value.getVirtualItems())

const leftVirtualPadding = computed(() => virtualColumnItems.value[0]?.start ?? 0)
const rightVirtualPadding = computed(() => {
  const last = virtualColumnItems.value.at(-1)
  if (!last) {
    return 0
  }

  return Math.max(0, columnVirtualizer.value.getTotalSize() - last.end)
})

const frozenColumnOffsets = computed(() => {
  const offsets: number[] = []
  let cursor = 0

  for (const column of frozenColumns.value) {
    offsets.push(cursor)
    cursor += getColumnWidth(column)
  }

  return offsets
})

const totalWidth = computed(() => {
  const frozenWidth = frozenColumns.value.reduce((sum, column) => sum + getColumnWidth(column), 0)
  return frozenWidth + columnVirtualizer.value.getTotalSize()
})
const virtualBodyHeight = computed(() => rowVirtualizer.value.getTotalSize())

const hasData = computed(() => allRows.value.length > 0)

function getColumnWidth(column: Column<TData, unknown>) {
  return column.getSize() || props.estimateColumnWidth
}

function getBodyRow(virtualIndex: number) {
  return virtualRowsSource.value[virtualIndex]
}

function getFrozenCell(row: Row<TData>, frozenColumnIndex: number) {
  return row.getVisibleCells()[frozenColumnIndex]
}

function getVirtualCell(row: Row<TData>, virtualColumnIndex: number) {
  return row.getVisibleCells()[clampedFrozenLeftColumns.value + virtualColumnIndex]
}

function getFrozenRowTop(index: number) {
  return props.headerHeight + (index * props.rowHeight)
}

function getLeafHeaderContext(index: number) {
  return leafHeaders.value[index]?.getContext()
}

function isStripedRow(rowIndex: number) {
  return rowIndex % 2 === 1
}

function isFrozenEdgeColumn(frozenColumnIndex: number) {
  return frozenColumnIndex === clampedFrozenLeftColumns.value - 1
}

function getRowClassName(row: Row<TData>, rowIndex: number) {
  return props.rowClassName?.(row, rowIndex)
}
</script>

<template>
  <div
    ref="scrollContainerRef"
    data-slot="virtual-table-container"
    :class="cn('relative w-full overflow-auto rounded-md bg-background', props.class)"
    :style="{ height: props.height ? `${props.height}px` : '100%' }"
  >
    <div
      data-slot="virtual-table"
      class="relative min-w-full"
      :style="{ width: `${totalWidth}px` }"
    >
      <div
        data-slot="virtual-table-header"
        class="sticky top-0 z-40 border-b bg-background"
      >
        <div class="relative flex" :style="{ height: `${props.headerHeight}px` }">
          <template v-for="(column, frozenColumnIndex) in frozenColumns" :key="`header-frozen-${column.id}`">
            <div
              data-slot="virtual-table-head"
              :style="{
                width: `${getColumnWidth(column)}px`,
                minWidth: `${getColumnWidth(column)}px`,
                maxWidth: `${getColumnWidth(column)}px`,
                left: `${frozenColumnOffsets[frozenColumnIndex]}px`,
                height: `${props.headerHeight}px`,
              }"
              :class="[
                'text-foreground sticky z-50 border-r border-border bg-background px-2 text-left align-middle text-xs whitespace-nowrap overflow-hidden',
                isFrozenEdgeColumn(frozenColumnIndex) ? 'shadow-sm' : '',
              ]"
            >
              <div class="flex h-full min-w-0 items-center">
                <div class="w-full min-w-0 truncate">
                  <FlexRender
                    :render="column.columnDef.header"
                    :props="getLeafHeaderContext(frozenColumnIndex)"
                  />
                </div>
              </div>
            </div>
          </template>

          <div
            v-if="leftVirtualPadding > 0"
            aria-hidden="true"
            :style="{ width: `${leftVirtualPadding}px` }"
            class="shrink-0"
          />

          <template v-for="virtualColumn in virtualColumnItems" :key="`header-virtual-${virtualColumn.key}`">
            <div
              v-if="virtualColumnsSource[virtualColumn.index]"
              data-slot="virtual-table-head"
              :style="{
                width: `${virtualColumn.size}px`,
                minWidth: `${virtualColumn.size}px`,
                maxWidth: `${virtualColumn.size}px`,
                height: `${props.headerHeight}px`,
              }"
              class="text-foreground border-r border-border bg-background px-2 text-left align-middle text-xs font-medium whitespace-nowrap overflow-hidden"
            >
              <div class="flex h-full min-w-0 items-center">
                <div class="w-full min-w-0 truncate">
                  <FlexRender
                    :render="virtualColumnsSource[virtualColumn.index].columnDef.header"
                    :props="getLeafHeaderContext(clampedFrozenLeftColumns + virtualColumn.index)"
                  />
                </div>
              </div>
            </div>
          </template>

          <div
            v-if="rightVirtualPadding > 0"
            aria-hidden="true"
            :style="{ width: `${rightVirtualPadding}px` }"
            class="shrink-0"
          />
        </div>
      </div>

      <template v-for="(row, frozenRowIndex) in frozenRows" :key="`frozen-row-${row.id}`">
        <div
          data-slot="virtual-table-row"
          :class="[
            'hover:bg-muted/50 data-[state=selected]:bg-muted absolute left-0 right-0 z-30 flex transition-colors',
            isStripedRow(frozenRowIndex) ? 'bg-muted' : 'bg-background',
            getRowClassName(row, frozenRowIndex),
          ]"
          :style="{
            top: `${getFrozenRowTop(frozenRowIndex)}px`,
            height: `${props.rowHeight}px`,
          }"
        >
          <template v-for="(column, frozenColumnIndex) in frozenColumns" :key="`frozen-cell-${row.id}-${column.id}`">
            <div
              data-slot="virtual-table-cell"
              :style="{
                width: `${getColumnWidth(column)}px`,
                minWidth: `${getColumnWidth(column)}px`,
                maxWidth: `${getColumnWidth(column)}px`,
                left: `${frozenColumnOffsets[frozenColumnIndex]}px`,
                height: `${props.rowHeight}px`,
              }"
              :class="[
                'sticky z-30 border-r border-b border-border p-2 align-middle text-sm whitespace-nowrap overflow-hidden',
                isStripedRow(frozenRowIndex) ? 'bg-muted' : 'bg-background',
                isFrozenEdgeColumn(frozenColumnIndex) ? 'shadow-sm' : '',
              ]"
            >
              <div class="flex h-full min-w-0 items-center">
                <div class="w-full min-w-0 truncate">
                  <FlexRender
                    :render="getFrozenCell(row, frozenColumnIndex).column.columnDef.cell"
                    :props="getFrozenCell(row, frozenColumnIndex).getContext()"
                  />
                </div>
              </div>
            </div>
          </template>

          <div
            v-if="leftVirtualPadding > 0"
            aria-hidden="true"
            :style="{ width: `${leftVirtualPadding}px` }"
            class="shrink-0"
          />

          <template v-for="virtualColumn in virtualColumnItems" :key="`frozen-row-virtual-cell-${row.id}-${virtualColumn.key}`">
            <div
              data-slot="virtual-table-cell"
              :style="{
                width: `${virtualColumn.size}px`,
                minWidth: `${virtualColumn.size}px`,
                maxWidth: `${virtualColumn.size}px`,
                height: `${props.rowHeight}px`,
              }"
              class="border-r border-border p-2 align-middle text-sm whitespace-nowrap overflow-hidden"
            >
              <div class="flex h-full min-w-0 items-center">
                <div class="w-full min-w-0 truncate">
                  <FlexRender
                    :render="getVirtualCell(row, virtualColumn.index).column.columnDef.cell"
                    :props="getVirtualCell(row, virtualColumn.index).getContext()"
                  />
                </div>
              </div>
            </div>
          </template>

          <div
            v-if="rightVirtualPadding > 0"
            aria-hidden="true"
            :style="{ width: `${rightVirtualPadding}px` }"
            class="shrink-0"
          />
        </div>
      </template>

      <div
        v-if="hasData"
        data-slot="virtual-table-body"
        class="relative"
        :style="{
          marginTop: `${frozenRowsHeight}px`,
          height: `${virtualBodyHeight}px`,
        }"
      >
        <template v-for="virtualRow in virtualRowItems" :key="`virtual-row-${virtualRow.key}`">
          <div
            v-if="getBodyRow(virtualRow.index)"
            data-slot="virtual-table-row"
            :class="[
              'hover:bg-muted/50 data-[state=selected]:bg-muted absolute left-0 right-0 flex transition-colors',
              isStripedRow(clampedFrozenTopRows + virtualRow.index) ? 'bg-muted' : 'bg-background',
              getRowClassName(getBodyRow(virtualRow.index), clampedFrozenTopRows + virtualRow.index),
            ]"
            :style="{
              transform: `translateY(${virtualRow.start}px)`,
              height: `${virtualRow.size}px`,
            }"
          >
            <template
              v-for="(column, frozenColumnIndex) in frozenColumns"
              :key="`virtual-frozen-cell-${getBodyRow(virtualRow.index).id}-${column.id}`"
            >
              <div
                data-slot="virtual-table-cell"
                :style="{
                  width: `${getColumnWidth(column)}px`,
                  minWidth: `${getColumnWidth(column)}px`,
                  maxWidth: `${getColumnWidth(column)}px`,
                  left: `${frozenColumnOffsets[frozenColumnIndex]}px`,
                  height: `${virtualRow.size}px`,
                }"
                :class="[
                  'sticky z-20 border-r border-b border-border p-2 align-middle text-sm whitespace-nowrap overflow-hidden',
                  isStripedRow(clampedFrozenTopRows + virtualRow.index) ? 'bg-muted' : 'bg-background',
                  isFrozenEdgeColumn(frozenColumnIndex) ? 'shadow-sm' : '',
                ]"
              >
                <div class="flex h-full min-w-0 items-center">
                  <div class="w-full min-w-0 truncate">
                    <FlexRender
                      :render="getFrozenCell(getBodyRow(virtualRow.index), frozenColumnIndex).column.columnDef.cell"
                      :props="getFrozenCell(getBodyRow(virtualRow.index), frozenColumnIndex).getContext()"
                    />
                  </div>
                </div>
              </div>
            </template>

            <div
              v-if="leftVirtualPadding > 0"
              aria-hidden="true"
              :style="{ width: `${leftVirtualPadding}px` }"
              class="shrink-0"
            />

            <template
              v-for="virtualColumn in virtualColumnItems"
              :key="`virtual-cell-${virtualRow.key}-${virtualColumn.key}`"
            >
              <div
                data-slot="virtual-table-cell"
                :style="{
                  width: `${virtualColumn.size}px`,
                  minWidth: `${virtualColumn.size}px`,
                  maxWidth: `${virtualColumn.size}px`,
                  height: `${virtualRow.size}px`,
                }"
                class="border-r border-border p-2 align-middle text-sm whitespace-nowrap overflow-hidden"
              >
                <div class="flex h-full min-w-0 items-center">
                  <div class="w-full min-w-0 truncate">
                    <FlexRender
                      :render="getVirtualCell(getBodyRow(virtualRow.index), virtualColumn.index).column.columnDef.cell"
                      :props="getVirtualCell(getBodyRow(virtualRow.index), virtualColumn.index).getContext()"
                    />
                  </div>
                </div>
              </div>
            </template>

            <div
              v-if="rightVirtualPadding > 0"
              aria-hidden="true"
              :style="{ width: `${rightVirtualPadding}px` }"
              class="shrink-0"
            />
          </div>
        </template>
      </div>

      <div
        v-else
        data-slot="virtual-table-empty"
        class="flex items-center justify-center text-sm text-muted-foreground"
        :style="{
          height: `${Math.max(160, props.height - props.headerHeight)}px`,
        }"
      >
        {{ props.emptyText }}
      </div>
    </div>
  </div>
</template>
