<script setup lang="ts">
import type { FlatCollectionNode } from '../types'
import type { TreeDropPosition } from './useCollectionTreeDnD'
import { Braces, ChevronRight, Folder, FolderOpen, Layers, Trash2 } from '@lucide/vue'
import { computed, nextTick, ref, watch } from 'vue'
import { cn } from '@/lib/utils'
import { methodColorClass } from '../lib/method-colors'
import {
  apiStudioTreeNodeNameClass,
  apiStudioTreeRenameInputClass,
  apiStudioIconButtonClass,
  apiStudioTreeRowClass,
  apiStudioTreeRowSelectedClass,
} from '../api-studio-styles'

const props = withDefaults(defineProps<{
  node: FlatCollectionNode
  selected: boolean
  editing?: boolean
  highlightTerm?: string
  dragging?: boolean
  dropPosition?: TreeDropPosition | null
  tabDropHighlight?: boolean
  dragEnabled?: boolean
}>(), {
  editing: false,
  dragEnabled: true,
})

const emit = defineEmits<{
  toggle: [id: string]
  select: [id: string]
  startEdit: [id: string]
  commitRename: [id: string, name: string]
  cancelEdit: []
  contextMenu: [node: FlatCollectionNode, ev: MouseEvent]
  dragStart: [id: string, ev: DragEvent]
  dragOver: [node: FlatCollectionNode, ev: DragEvent]
  dragLeave: []
  drop: [node: FlatCollectionNode, ev: DragEvent]
  tabDragOver: [parentId: string, ev: DragEvent]
  tabDrop: [parentId: string, ev: DragEvent]
  delete: [id: string]
}>()

const INDENT_PX = 14

const renameInputRef = ref<HTMLInputElement | null>(null)
const editName = ref('')

interface HighlightPart {
  text: string
  match: boolean
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function splitHighlightParts(text: string, term?: string): HighlightPart[] {
  if (!text) return [{ text: '', match: false }]
  const normalized = term?.trim()
  if (!normalized) return [{ text, match: false }]

  const matcher = new RegExp(`(${escapeRegExp(normalized)})`, 'ig')
  const tokens = text.split(matcher).filter(Boolean)
  if (tokens.length === 0) return [{ text, match: false }]

  return tokens.map(token => ({
    text: token,
    match: token.toLowerCase() === normalized.toLowerCase(),
  }))
}

const isBranch = computed(
  () => props.node.kind === 'collection' || props.node.kind === 'folder',
)

/** Child nodes under a collection (folder / request), not root collection rows. */
const showRowDelete = computed(
  () => props.node.depth > 0 && !props.editing,
)

function handleRowClick() {
  if (props.editing) return
  if (props.node.hasChildren) {
    emit('toggle', props.node.id)
  }
  emit('select', props.node.id)
}

function handleNameClick(ev: MouseEvent) {
  ev.stopPropagation()
  emit('select', props.node.id)
}

function handleNameDblClick(ev: MouseEvent) {
  ev.stopPropagation()
  emit('select', props.node.id)
  if (!props.editing) {
    emit('startEdit', props.node.id)
  }
}

function focusRenameInput() {
  nextTick(() => {
    const el = renameInputRef.value
    if (!el) return
    el.focus()
    el.select()
  })
}

watch(
  () => props.editing,
  (editing) => {
    if (editing) {
      editName.value = props.node.name
      focusRenameInput()
    }
  },
  { immediate: true },
)

function commitRename() {
  const trimmed = editName.value.trim()
  if (!trimmed || trimmed === props.node.name) {
    emit('cancelEdit')
    return
  }
  emit('commitRename', props.node.id, trimmed)
}

function cancelRename() {
  editName.value = props.node.name
  emit('cancelEdit')
}

function onRenameKeydown(ev: KeyboardEvent) {
  if (ev.key === 'Enter') {
    ev.preventDefault()
    commitRename()
  }
  else if (ev.key === 'Escape') {
    ev.preventDefault()
    cancelRename()
  }
}

function handleContextMenu(ev: MouseEvent) {
  emit('contextMenu', props.node, ev)
}

function onDragStart(ev: DragEvent) {
  if (!props.dragEnabled || props.editing) {
    ev.preventDefault()
    return
  }
  ev.dataTransfer?.setData('application/x-lynx-collection-node', props.node.id)
  ev.dataTransfer?.setData('text/plain', props.node.id)
  if (ev.dataTransfer) {
    ev.dataTransfer.effectAllowed = 'move'
  }
  emit('dragStart', props.node.id, ev)
}

function onDragOver(ev: DragEvent) {
  const tabId = ev.dataTransfer?.types.includes('application/x-lynx-api-tab')
  if (tabId && isBranch.value) {
    ev.preventDefault()
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move'
    emit('tabDragOver', props.node.id, ev)
    return
  }
  emit('dragOver', props.node, ev)
}

function onDrop(ev: DragEvent) {
  if (ev.dataTransfer?.types.includes('application/x-lynx-api-tab')
    && isBranch.value) {
    ev.preventDefault()
    emit('tabDrop', props.node.id, ev)
    return
  }
  emit('drop', props.node, ev)
}
</script>

<template>
  <div
    class="relative"
    :class="props.dragging ? 'opacity-40' : ''"
    @dragleave="emit('dragLeave')"
    @dragover="onDragOver"
    @drop="onDrop"
  >
    <div
      v-if="props.dropPosition === 'before'"
      class="pointer-events-none absolute right-1 left-1 top-0 z-10 h-0.5 rounded-full bg-primary"
    />
    <div
      v-if="props.dropPosition === 'after'"
      class="pointer-events-none absolute right-1 bottom-0 left-1 z-10 h-0.5 rounded-full bg-primary"
    />

    <div
      :draggable="props.dragEnabled && !props.editing"
      :class="cn(
        apiStudioTreeRowClass,
        'group pr-0.5',
        props.selected && apiStudioTreeRowSelectedClass,
        props.dropPosition === 'inside' && 'ring-1 ring-primary/50 bg-primary/5',
        props.tabDropHighlight && isBranch && 'ring-1 ring-primary/40 bg-primary/5',
        props.dragEnabled && !props.editing && 'cursor-grab active:cursor-grabbing',
      )"
      :style="{ paddingLeft: `${props.node.depth * INDENT_PX + 6}px` }"
      @click="handleRowClick"
      @contextmenu.prevent="handleContextMenu"
      @dragstart="onDragStart"
    >
      <button
        v-if="props.node.hasChildren"
        type="button"
        class="flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:bg-muted/60"
        draggable="false"
        @click.stop="emit('toggle', props.node.id)"
        @dragstart.stop
      >
        <ChevronRight
          class="size-3 transition-transform"
          :class="props.node.expanded ? 'rotate-90' : ''"
        />
      </button>
      <span v-else class="inline-block w-4 shrink-0" />

      <Layers
        v-if="props.node.kind === 'collection'"
        class="size-3.5 shrink-0 text-primary"
      />
      <FolderOpen
        v-else-if="props.node.kind === 'folder' && props.node.expanded"
        class="size-3.5 shrink-0 text-amber-600 dark:text-amber-400"
      />
      <Folder
        v-else-if="props.node.kind === 'folder'"
        class="size-3.5 shrink-0 text-amber-600 dark:text-amber-400"
      />
      <Braces
        v-else-if="props.node.kind === 'request'"
        class="size-3.5 shrink-0 text-primary"
      />

      <span
        v-if="props.node.kind === 'request' && props.node.method"
        :class="['w-10 shrink-0 font-mono text-[10px] font-semibold', methodColorClass(props.node.method)]"
      >
        {{ props.node.method }}
      </span>

      <input
        v-if="props.editing"
        ref="renameInputRef"
        v-model="editName"
        type="text"
        :class="apiStudioTreeRenameInputClass"
        draggable="false"
        @click.stop
        @mousedown.stop
        @keydown="onRenameKeydown"
        @blur="commitRename"
      >
      <span
        v-else
        :class="[apiStudioTreeNodeNameClass, 'cursor-text']"
        title="双击编辑名称"
        @click.stop="handleNameClick"
        @dblclick.stop="handleNameDblClick"
      >
        <template
          v-for="(part, index) in splitHighlightParts(props.node.name, props.highlightTerm)"
          :key="`${props.node.id}-${index}`"
        >
          <mark
            v-if="part.match"
            class="rounded-sm bg-primary/20 px-0.5 text-foreground"
          >{{ part.text }}</mark>
          <span v-else>{{ part.text }}</span>
        </template>
      </span>

      <button
        v-if="showRowDelete"
        type="button"
        :class="cn(
          apiStudioIconButtonClass,
          '!size-5 shrink-0 text-destructive opacity-0 transition-opacity group-hover:opacity-100',
        )"
        title="删除"
        aria-label="删除"
        draggable="false"
        @click.stop="emit('delete', props.node.id)"
        @mousedown.stop
        @dragstart.stop
      >
        <Trash2 class="size-2.5" />
      </button>
    </div>
  </div>
</template>
