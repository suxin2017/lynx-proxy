import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import type { CollectionNode, CollectionTreeAction } from '../types'
import CollectionTree from './CollectionTree.vue'
import { MOCK_COLLECTION_NODES, generateLargeCollectionNodes } from '../mock/collection-tree'

const meta = {
  title: 'API Studio/CollectionTree',
  component: CollectionTree,
  args: {
    nodes: [] as CollectionNode[],
    height: 480,
  },
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof CollectionTree>

export default meta

type Story = StoryObj<typeof meta>

export const Empty: Story = {
  render: () => ({
    components: { CollectionTree },
    setup() {
      const nodes = ref<CollectionNode[]>([])
      const selectedId = ref<string | undefined>(undefined)
      const log = ref<string[]>([])

      function onCreate(kind: string) {
        log.value = [`create: ${kind}`, ...log.value].slice(0, 6)
      }

      return { nodes, selectedId, log, onCreate }
    },
    template: `
      <div style="width: 320px;">
        <CollectionTree
          :nodes="nodes"
          v-model:selected-id="selectedId"
          :height="420"
          @create="onCreate"
        />
        <ul v-if="log.length" style="margin-top:8px;font-size:11px;color:#6b7280;list-style:disc;padding-left:16px;">
          <li v-for="(line, i) in log" :key="i">{{ line }}</li>
        </ul>
      </div>
    `,
  }),
}

export const NestedFolders: Story = {
  render: () => ({
    components: { CollectionTree },
    setup() {
      const nodes = ref([...MOCK_COLLECTION_NODES])
      const selectedId = ref('req-login')
      return { nodes, selectedId }
    },
    template: `
      <div style="width: 320px;">
        <CollectionTree
          :nodes="nodes"
          v-model:selected-id="selectedId"
          :height="520"
        />
        <p v-if="selectedId" style="margin-top:8px;font-size:12px;color:#6b7280;">
          Selected: {{ selectedId }}
        </p>
      </div>
    `,
  }),
}

export const WithSearch: Story = {
  render: () => ({
    components: { CollectionTree },
    setup() {
      const nodes = ref([...MOCK_COLLECTION_NODES])
      const selectedId = ref<string | undefined>(undefined)
      return { nodes, selectedId }
    },
    template: `
      <div style="width: 320px;">
        <p style="margin-bottom:8px;font-size:12px;color:#6b7280;">
          在搜索框输入 "user" 或 "webhook" 过滤节点
        </p>
        <CollectionTree
          :nodes="nodes"
          v-model:selected-id="selectedId"
          :height="480"
        />
      </div>
    `,
  }),
}

export const ContextMenuActions: Story = {
  render: () => ({
    components: { CollectionTree },
    setup() {
      const nodes = ref([...MOCK_COLLECTION_NODES])
      const selectedId = ref('folder-auth')
      const log = ref<string[]>([])

      function onAction(action: CollectionTreeAction, node: CollectionNode) {
        log.value = [`${action} → ${node.name} (${node.kind})`, ...log.value].slice(0, 8)
      }

      function onRename(node: CollectionNode, name: string) {
        nodes.value = nodes.value.map(n =>
          n.id === node.id ? { ...n, name: name.trim() } : n,
        )
        log.value = [`rename → ${name.trim()}`, ...log.value].slice(0, 8)
      }

      return { nodes, selectedId, log, onAction, onRename }
    },
    template: `
      <div style="width: 340px;">
        <p style="margin-bottom:8px;font-size:12px;color:#6b7280;">
          双击节点名称内联编辑；右键可重命名 / 新建 / 删除
        </p>
        <CollectionTree
          :nodes="nodes"
          v-model:selected-id="selectedId"
          :height="480"
          @tree-action="onAction"
          @node-rename="onRename"
        />
        <ul style="margin-top:8px;font-size:11px;color:#6b7280;list-style:disc;padding-left:16px;">
          <li v-for="(line, i) in log" :key="i">{{ line }}</li>
        </ul>
      </div>
    `,
  }),
}

export const LargeCollection: Story = {
  render: () => ({
    components: { CollectionTree },
    setup() {
      const nodes = ref(generateLargeCollectionNodes(80))
      const selectedId = ref<string | undefined>(undefined)
      return { nodes, selectedId }
    },
    template: `
      <div style="width: 340px;">
        <p style="margin-bottom:8px;font-size:12px;color:#6b7280;">
          ~80 节点 — 滚动与展开性能
        </p>
        <CollectionTree
          :nodes="nodes"
          v-model:selected-id="selectedId"
          :height="600"
          default-expand-all
        />
      </div>
    `,
  }),
}
