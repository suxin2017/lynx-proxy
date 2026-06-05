import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import type { ApiRequestHistoryEntry } from '../types'
import { MOCK_COLLECTION_NODES } from '../mock/collection-tree'
import { generateHistoryEntries, MOCK_HISTORY_ENTRIES } from '../mock/request-history'
import ApiRequestHistoryPanel from './ApiRequestHistoryPanel.vue'
import ApiStudioSidebar from './ApiStudioSidebar.vue'

const meta = {
  title: 'API Studio/ApiRequestHistoryPanel',
  component: ApiRequestHistoryPanel,
  args: {
    entries: [] as ApiRequestHistoryEntry[],
    selectedId: undefined,
  },
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof ApiRequestHistoryPanel>

export default meta

type Story = StoryObj<typeof meta>

const panelChrome = 'h-[480px] w-[280px] overflow-hidden rounded-lg border border-border bg-card'

export const Empty: Story = {
  render: () => ({
    components: { ApiRequestHistoryPanel },
    setup() {
      return { entries: [] as ApiRequestHistoryEntry[], selectedId: undefined, panelChrome }
    },
    template: `
      <div :class="panelChrome">
        <ApiRequestHistoryPanel
          :entries="entries"
          :selected-id="selectedId"
        />
      </div>
    `,
  }),
}

export const WithEntries: Story = {
  render: () => ({
    components: { ApiRequestHistoryPanel },
    setup() {
      const entries = ref([...MOCK_HISTORY_ENTRIES])
      const selectedId = ref<string | undefined>(undefined)
      return { entries, selectedId, panelChrome }
    },
    template: `
      <div :class="panelChrome">
        <ApiRequestHistoryPanel
          :entries="entries"
          :selected-id="selectedId"
          @select="selectedId = $event.id"
        />
      </div>
    `,
  }),
}

export const Selected: Story = {
  render: () => ({
    components: { ApiRequestHistoryPanel },
    setup() {
      const entries = ref([...MOCK_HISTORY_ENTRIES])
      const selectedId = ref('hist-login-201')
      return { entries, selectedId, panelChrome }
    },
    template: `
      <div :class="panelChrome">
        <ApiRequestHistoryPanel
          :entries="entries"
          :selected-id="selectedId"
        />
      </div>
    `,
  }),
}

export const ScrollableList: Story = {
  render: () => ({
    components: { ApiRequestHistoryPanel },
    setup() {
      const entries = ref(generateHistoryEntries(24))
      const selectedId = ref('hist-gen-3')
      return { entries, selectedId, panelChrome }
    },
    template: `
      <div :class="panelChrome">
        <ApiRequestHistoryPanel
          :entries="entries"
          :selected-id="selectedId"
        />
      </div>
    `,
  }),
}

export const Interactive: Story = {
  render: () => ({
    components: { ApiRequestHistoryPanel },
    setup() {
      const entries = ref([...MOCK_HISTORY_ENTRIES])
      const selectedId = ref<string | undefined>('hist-users-200')
      const log = ref<string[]>([])

      function onSelect(entry: ApiRequestHistoryEntry) {
        selectedId.value = entry.id
        log.value = [`select: ${entry.method} ${entry.url}`, ...log.value].slice(0, 8)
      }

      function onRemove(id: string) {
        entries.value = entries.value.filter(e => e.id !== id)
        if (selectedId.value === id) {
          selectedId.value = undefined
        }
        log.value = [`remove: ${id}`, ...log.value].slice(0, 8)
      }

      function onClear() {
        entries.value = []
        selectedId.value = undefined
        log.value = ['clear all', ...log.value].slice(0, 8)
      }

      return { entries, selectedId, log, onSelect, onRemove, onClear, panelChrome }
    },
    template: `
      <div style="display:flex;gap:16px;align-items:flex-start;">
        <div :class="panelChrome">
          <ApiRequestHistoryPanel
            :entries="entries"
            :selected-id="selectedId"
            @select="onSelect"
            @remove="onRemove"
            @clear="onClear"
          />
        </div>
        <ul
          v-if="log.length"
          style="margin:0;min-width:200px;font-size:11px;color:#6b7280;list-style:disc;padding-left:16px;"
        >
          <li v-for="(line, i) in log" :key="i">{{ line }}</li>
        </ul>
      </div>
    `,
  }),
}

export const InSidebar: Story = {
  render: () => ({
    components: { ApiStudioSidebar },
    setup() {
      const nodes = ref([...MOCK_COLLECTION_NODES])
      const entries = ref([...MOCK_HISTORY_ENTRIES])
      const selectedHistoryId = ref('hist-login-201')
      const sidebarView = ref<'collections' | 'history'>('history')
      const selectedId = ref<string | undefined>('req-login')

      return { nodes, entries, selectedHistoryId, sidebarView, selectedId }
    },
    template: `
      <div class="h-[560px] w-[300px] overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <ApiStudioSidebar
          :nodes="nodes"
          :history-entries="entries"
          :selected-history-id="selectedHistoryId"
          v-model:sidebar-view="sidebarView"
          v-model:selected-id="selectedId"
          class="h-full"
        />
      </div>
    `,
  }),
}
