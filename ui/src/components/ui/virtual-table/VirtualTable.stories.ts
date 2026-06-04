import type { Meta, StoryObj } from "@storybook/vue3-vite"
import type { ColumnDef } from "@tanstack/vue-table"
import { h, nextTick, ref } from "vue"
import VirtualTable from "./VirtualTable.vue"

type GridRow = Record<string, unknown> & {
  id: number
  group: string
  score: number
}

const MAX_STORY_ROWS = 100000

const meta = {
  title: "Data Display/VirtualTable",
  component: VirtualTable as unknown as object,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

function createRows(count: number): GridRow[] {
  const safeCount = Math.min(count, MAX_STORY_ROWS)

  return Array.from({ length: safeCount }, (_, index) => ({
    id: index,
    group: `group-${index % 12}`,
    score: (index * 37) % 1000,
  }))
}

function createColumns(count: number): ColumnDef<GridRow>[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `col_${index}`,
    header: `Column ${index + 1}`,
    size: index < 3 ? 140 : 180,
    accessorFn: (row) => {
      if (index === 0) {
        return row.id
      }
      if (index === 1) {
        return row.group
      }
      if (index === 2) {
        return row.score
      }
      return `${row.id}-${index}`
    },
    cell: ({ getValue }) => String(getValue()),
  }))
}

export const Basic1000: Story = {
  args: {
    data: createRows(1000),
    columns: createColumns(20),
    height: 520,
    frozenTopRows: 0,
    frozenLeftColumns: 0,
  },
}

export const FrozenColumns: Story = {
  args: {
    data: createRows(5000),
    columns: createColumns(50),
    height: 540,
    rowHeight: 36,
    frozenLeftColumns: 3,
    frozenTopRows: 0,
  },
}

export const HorizontalVirtualization: Story = {
  args: {
    data: createRows(3000),
    columns: createColumns(200),
    height: 520,
    rowHeight: 36,
    frozenLeftColumns: 2,
    frozenTopRows: 0,
    overscanColumns: 3,
  },
}

type StreamingRow = Record<string, unknown> & {
  id: number
  timestamp: string
  level: "INFO" | "WARN" | "ERROR"
  source: string
  message: string
  note: string
}

function createStreamingRow(id: number): StreamingRow {
  const now = new Date()
  const iso = now.toISOString().slice(11, 23)
  const level = (id % 17 === 0 ? "ERROR" : id % 7 === 0 ? "WARN" : "INFO") as StreamingRow["level"]
  const source = `service-${(id % 9) + 1}`
  const message = id % 5 === 0
    ? `request=${id} route=/api/v1/orders/${id % 300} duration=${20 + (id % 160)}ms`
    : `ok-${id}`
  const note = id % 11 === 0
    ? `Long note for row ${id}: this is a simulated streaming payload with a much longer cell value for visual comparison.`
    : "-"

  return {
    id,
    timestamp: iso,
    level,
    source,
    message,
    note,
  }
}

function createStreamingRows(count: number): StreamingRow[] {
  const safeCount = Math.min(count, MAX_STORY_ROWS)
  return Array.from({ length: safeCount }, (_, index) => createStreamingRow(index + 1))
}

const streamingColumns: ColumnDef<StreamingRow>[] = [
  {
    id: "id",
    header: "ID",
    size: 90,
    accessorKey: "id",
  },
  {
    id: "timestamp",
    header: "Timestamp",
    size: 160,
    accessorKey: "timestamp",
  },
  {
    id: "level",
    header: "Level",
    size: 100,
    accessorKey: "level",
  },
  {
    id: "source",
    header: "Source",
    size: 140,
    accessorKey: "source",
  },
  {
    id: "message",
    header: "Message (short / long)",
    size: 320,
    accessorKey: "message",
  },
  {
    id: "note",
    header: "Note (variable length)",
    size: 460,
    accessorKey: "note",
  },
]

export const StreamingRowsVariableCellLength: Story = {
  args: {
    data: [],
    columns: streamingColumns,
    height: 540,
    rowHeight: 36,
    frozenLeftColumns: 2,
    frozenTopRows: 0,
    overscanRows: 10,
    overscanColumns: 3,
  },
  render: (args) => ({
    components: { VirtualTable },
    setup() {
      const rows = ref<StreamingRow[]>(createStreamingRows(300))
      const tableRef = ref<{ $el?: HTMLElement } | HTMLElement | null>(null)
      let nextId = rows.value.length + 1

      const scrollToBottom = async () => {
        await nextTick()
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

        const tableEl = tableRef.value instanceof HTMLElement
          ? tableRef.value
          : tableRef.value?.$el
        const scrollContainer = tableEl as HTMLElement | null

        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight
        }
      }

      const getScrollContainer = () => {
        const tableEl = tableRef.value instanceof HTMLElement
          ? tableRef.value
          : tableRef.value?.$el

        return (tableEl as HTMLElement | null)
      }

      const isAtBottom = () => {
        const scrollContainer = getScrollContainer()
        if (!scrollContainer) {
          return false
        }

        const threshold = 2
        const distanceToBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight
        return distanceToBottom <= threshold
      }

      const appendRows = (batch: number) => {
        const shouldFollowBottom = isAtBottom()
        const safeBatch = Math.max(1, batch)
        const next = Array.from({ length: safeBatch }, () => {
          const row = createStreamingRow(nextId)
          nextId += 1
          return row
        })

        rows.value = [...rows.value, ...next]

        if (rows.value.length > MAX_STORY_ROWS) {
          rows.value = rows.value.slice(rows.value.length - MAX_STORY_ROWS)
        }

        if (shouldFollowBottom) {
          void scrollToBottom()
        }
      }

      return {
        args,
        rows,
        appendRows,
        tableRef,
      }
    },
    template: `
      <div class="p-4">
        <p class="mb-2 text-sm text-muted-foreground">
          Manual stream controls (capped at 100000).
        </p>
        <div class="mb-3 flex items-center gap-2">
          <button
            type="button"
            class="rounded-md border border-border bg-background px-3 py-1 text-xs font-medium hover:bg-muted"
            @click="appendRows(1)"
          >
            +1 row
          </button>
          <button
            type="button"
            class="rounded-md border border-border bg-background px-3 py-1 text-xs font-medium hover:bg-muted"
            @click="appendRows(10)"
          >
            +10 rows
          </button>
          <button
            type="button"
            class="rounded-md border border-border bg-background px-3 py-1 text-xs font-medium hover:bg-muted"
            @click="appendRows(100)"
          >
            +100 rows
          </button>
          <span class="ml-2 text-xs text-muted-foreground">current: {{ rows.length }}</span>
        </div>
        <div class="max-w-245">
          <VirtualTable ref="tableRef" v-bind="args" :data="rows" />
        </div>
      </div>
    `,
  }),
}

type CustomCellRow = Record<string, unknown> & {
  id: number
  service: string
  status: "online" | "degraded" | "offline"
  docs: string
  owner: string
}

function createCustomCellRows(count: number): CustomCellRow[] {
  const safeCount = Math.min(count, MAX_STORY_ROWS)
  const statuses: Array<CustomCellRow["status"]> = ["online", "degraded", "offline"]

  return Array.from({ length: safeCount }, (_, index) => ({
    id: index + 1,
    service: `gateway-${(index % 15) + 1}`,
    status: statuses[index % statuses.length],
    docs: `https://docs.example.com/services/${(index % 15) + 1}`,
    owner: `team-${(index % 8) + 1}`,
  }))
}

const customCellColumns: ColumnDef<CustomCellRow>[] = [
  {
    id: "id",
    header: "ID",
    size: 90,
    accessorKey: "id",
  },
  {
    id: "service",
    header: "Service",
    size: 180,
    accessorKey: "service",
  },
  {
    id: "status",
    header: "Tag Status",
    size: 180,
    accessorKey: "status",
    cell: ({ getValue }) => {
      const status = String(getValue())
      const className = status === "online"
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
        : status === "degraded"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
          : "border-rose-500/30 bg-rose-500/10 text-rose-700"

      return h(
        "span",
        {
          class: `inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${className}`,
        },
        status,
      )
    },
  },
  {
    id: "docs",
    header: "A Link",
    size: 320,
    accessorKey: "docs",
    cell: ({ getValue }) => {
      const url = String(getValue())
      return h(
        "a",
        {
          href: url,
          target: "_blank",
          rel: "noreferrer",
          class: "text-primary underline underline-offset-2 hover:opacity-80",
        },
        url,
      )
    },
  },
  {
    id: "owner",
    header: "Owner",
    size: 160,
    accessorKey: "owner",
  },
]

export const CustomCellsTagAndLink: Story = {
  args: {
    data: createCustomCellRows(2000),
    columns: customCellColumns,
    height: 520,
    rowHeight: 36,
    frozenLeftColumns: 1,
    frozenTopRows: 0,
    overscanRows: 8,
    overscanColumns: 3,
  },
  render: (args) => ({
    components: { VirtualTable },
    setup() {
      return { args }
    },
    template: `
      <div class="p-4">
        <div class="max-w-190">
          <VirtualTable v-bind="args" />
        </div>
      </div>
    `,
  }),
}
