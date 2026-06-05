<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed, ref, toRef, watch } from 'vue'
import type {
  CollectionCreateKind,
  CollectionMovePayload,
  CollectionNode,
  CollectionTreeAction,
  FlatCollectionNode,
} from '../types'
import { cn } from '@/lib/utils'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { apiStudioEmptyActionClass, apiStudioHintTextClass } from '../api-studio-styles'
import CollectionTreeToolbar from './CollectionTreeToolbar.vue'
import CollectionTreeNode from './CollectionTreeNode.vue'
import { useCollectionTree } from './useCollectionTree'
import { useCollectionTreeDnD } from './useCollectionTreeDnD'

const props = withDefaults(defineProps<{
  nodes: CollectionNode[]
  selectedId?: string
  height?: number
  defaultExpandAll?: boolean
  showImportCurl?: boolean
  /** When false, parent provides the only scroll container (e.g. ApiStudioSidebar). */
  containScroll?: boolean
  class?: HTMLAttributes['class']
}>(), {
  selectedId: undefined,
  height: undefined,
  defaultExpandAll: false,
  showImportCurl: true,
  containScroll: true,
})

const emit = defineEmits<{
  'update:selectedId': [id: string | undefined]
  /** Fired on every row click (even when selectedId unchanged). */
  'node-select': [node: CollectionNode]
  'tree-action': [action: CollectionTreeAction, node: CollectionNode]
  'node-rename': [node: CollectionNode, name: string]
  create: [kind: CollectionCreateKind]
  'move-node': [payload: CollectionMovePayload]
  'import-curl-click': []
  'tab-drop': [payload: { tabId: string; parentId: string }]
}>()

const editingNodeId = ref<string | null>(null)

const nodesRef = toRef(props, 'nodes')
const {
  searchTerm,
  flatNodes,
  selectedId: localSelectedId,
  toggleExpand,
  selectNode,
  nodeById,
  expandNode,
} = useCollectionTree(nodesRef, { defaultExpandAll: props.defaultExpandAll })

const dragDisabled = computed(() => searchTerm.value.trim().length > 0)

const {
  draggingId,
  startDrag,
  clearDrag,
  updateDropIndicator,
  commitDrop,
  dropPositionFor,
} = useCollectionTreeDnD(() => props.nodes)

const contextNode = ref<FlatCollectionNode | null>(null)
const contextOpen = ref(false)
const contextPosition = ref({ x: 0, y: 0 })
const tabDropTargetId = ref<string | null>(null)
const rowRefs = new Map<string, HTMLElement>()

const selectedValue = computed({
  get: () => props.selectedId ?? localSelectedId.value,
  set: (id: string | undefined) => {
    localSelectedId.value = id
    emit('update:selectedId', id)
  },
})

watch(
  () => props.selectedId,
  (id) => {
    if (id !== undefined) {
      localSelectedId.value = id
    }
  },
)

function onSelect(id: string) {
  if (editingNodeId.value && editingNodeId.value !== id) {
    editingNodeId.value = null
  }
  selectedValue.value = id
  const node = nodeById(id)
  if (node) {
    emit('node-select', node)
  }
}

function startEdit(id: string) {
  editingNodeId.value = id
  selectedValue.value = id
}

function cancelEdit() {
  editingNodeId.value = null
}

function commitRename(id: string, name: string) {
  editingNodeId.value = null
  const node = nodeById(id)
  if (node) {
    emit('node-rename', node, name)
  }
}

function openContextMenu(node: FlatCollectionNode, ev: MouseEvent) {
  contextNode.value = node
  contextPosition.value = { x: ev.clientX, y: ev.clientY }
  contextOpen.value = true
  selectNode(node.id)
  selectedValue.value = node.id
}

function emitTreeAction(action: CollectionTreeAction, node: CollectionNode) {
  if (action === 'rename') {
    contextOpen.value = false
    startEdit(node.id)
    return
  }
  emit('tree-action', action, node)
  contextOpen.value = false
}

function emitAction(action: CollectionTreeAction) {
  const node = contextNode.value ? nodeById(contextNode.value.id) : undefined
  if (!node) return
  emitTreeAction(action, node)
}

function deleteNode(id: string) {
  if (editingNodeId.value) return
  const node = nodeById(id)
  if (!node) return
  emitTreeAction('delete', node)
}

function deleteSelectedNode() {
  const id = selectedValue.value
  if (!id) return
  deleteNode(id)
}

function onTreeKeydown(ev: KeyboardEvent) {
  if (editingNodeId.value) return
  if (ev.key !== 'Delete' && ev.key !== 'Backspace') return
  const target = ev.target as HTMLElement | null
  if (target?.closest('input, textarea, [contenteditable="true"]')) return
  ev.preventDefault()
  deleteSelectedNode()
}

const canAddFolder = computed(() => {
  const node = contextNode.value
  if (!node) return false
  return node.kind === 'collection' || node.kind === 'folder'
})

const isEmpty = computed(() => props.nodes.length === 0)

function setRowRef(id: string, el: HTMLElement | null) {
  if (el) rowRefs.set(id, el)
  else rowRefs.delete(id)
}

function onNodeDragStart(id: string, ev: DragEvent) {
  if (dragDisabled.value) {
    ev.preventDefault()
    return
  }
  startDrag(id)
}

function onNodeDragOver(node: FlatCollectionNode, ev: DragEvent) {
  if (dragDisabled.value || !draggingId.value) return
  ev.preventDefault()
  const el = rowRefs.get(node.id)
  if (!el) return
  updateDropIndicator(node, ev.clientY, el)
}

function onNodeDrop(_node: FlatCollectionNode, ev: DragEvent) {
  ev.preventDefault()
  const payload = commitDrop()
  if (payload) {
    emit('move-node', payload)
    const parentId = payload.newParentId
    if (parentId) {
      expandNode(parentId)
    }
  }
  clearDrag()
}

function onDragEnd() {
  clearDrag()
  tabDropTargetId.value = null
}

function onTabDragOver(parentId: string) {
  tabDropTargetId.value = parentId
}

function onTabDrop(parentId: string, ev: DragEvent) {
  ev.preventDefault()
  const tabId = ev.dataTransfer?.getData('application/x-lynx-api-tab')
  tabDropTargetId.value = null
  if (tabId) {
    emit('tab-drop', { tabId, parentId })
  }
}

function onContainerDragEnd() {
  onDragEnd()
}
</script>

<template>
  <aside
    :class="cn(
      'flex flex-col bg-card',
      props.containScroll
        ? 'min-h-0 overflow-hidden rounded-lg border border-border'
        : 'h-auto min-h-0 w-full overflow-x-hidden',
      props.class,
    )"
    :style="props.height ? { height: `${props.height}px` } : undefined"
    @dragend="onContainerDragEnd"
  >
    <CollectionTreeToolbar
      v-model:search-term="searchTerm"
      :show-create-collection="isEmpty"
      :show-import-curl="props.showImportCurl"
      @create="emit('create', $event)"
      @import-curl-click="emit('import-curl-click')"
    />

    <div
      v-if="isEmpty"
      :class="cn(
        'flex flex-col items-center justify-center gap-2 px-4 py-8 text-center',
        props.containScroll && 'flex-1',
      )"
    >
      <p :class="apiStudioHintTextClass">
        还没有集合。新建集合后开始组织 API 请求。
      </p>
      <button
        type="button"
        :class="apiStudioEmptyActionClass"
        @click="emit('create', 'collection')"
      >
        新建集合
      </button>
    </div>

    <div
      v-else-if="flatNodes.length === 0"
      :class="cn(
        'flex items-center justify-center px-4 py-6 text-center',
        props.containScroll && 'flex-1',
      )"
    >
      <p :class="apiStudioHintTextClass">
        没有匹配的节点
      </p>
    </div>

    <div
      v-else
      tabindex="0"
      :class="cn(
        'px-1 py-1 outline-none focus-visible:ring-1 focus-visible:ring-ring/40',
        props.containScroll ? 'min-h-0 flex-1 overflow-y-auto overflow-x-hidden' : 'overflow-x-hidden',
      )"
      @keydown="onTreeKeydown"
    >
      <div
        v-for="node in flatNodes"
        :key="node.id"
        :ref="(el) => setRowRef(node.id, el as HTMLElement | null)"
      >
        <CollectionTreeNode
        :node="node"
        :selected="selectedValue === node.id"
        :editing="editingNodeId === node.id"
        :highlight-term="searchTerm"
        :dragging="draggingId === node.id"
        :drop-position="dragDisabled ? null : dropPositionFor(node.id)"
        :tab-drop-highlight="tabDropTargetId === node.id"
        :drag-enabled="!dragDisabled"
        @toggle="toggleExpand"
        @select="onSelect"
        @start-edit="startEdit"
        @commit-rename="commitRename"
        @cancel-edit="cancelEdit"
        @context-menu="openContextMenu"
        @drag-start="onNodeDragStart"
        @drag-over="onNodeDragOver"
        @drop="onNodeDrop"
        @tab-drag-over="onTabDragOver"
        @tab-drop="onTabDrop"
        @drag-end="onDragEnd"
        @delete="deleteNode"
        />
      </div>
    </div>

    <p
      v-if="dragDisabled && props.nodes.length > 0"
      class="shrink-0 border-t border-border/40 px-2 py-1 text-center text-[9px] text-muted-foreground"
    >
      搜索时不可拖拽
    </p>

    <ContextMenu v-model:open="contextOpen">
      <ContextMenuTrigger as-child>
        <span
          class="pointer-events-none fixed size-px opacity-0"
          :style="{ left: `${contextPosition.x}px`, top: `${contextPosition.y}px` }"
        />
      </ContextMenuTrigger>
      <ContextMenuContent class="w-52">
        <ContextMenuItem
          v-if="canAddFolder"
          @select="emitAction('new-folder')"
        >
          新建 Folder
        </ContextMenuItem>
        <ContextMenuItem
          v-if="canAddFolder"
          @select="emitAction('new-request')"
        >
          新建 Request
        </ContextMenuItem>
        <ContextMenuSeparator v-if="canAddFolder" />
        <ContextMenuItem @select="emitAction('rename')">
          重命名
        </ContextMenuItem>
        <ContextMenuItem @select="emitAction('duplicate')">
          复制
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          @select="emitAction('delete')"
        >
          删除
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  </aside>
</template>
