import { ref } from 'vue'
import type { CollectionMovePayload, CollectionNode, FlatCollectionNode } from '../types'
import { canMoveNodeToParent } from './useCollectionMutations'

export type TreeDropPosition = 'before' | 'inside' | 'after'

export interface TreeDropIndicator {
  targetId: string
  position: TreeDropPosition
}

export function useCollectionTreeDnD(nodes: () => CollectionNode[]) {
  const draggingId = ref<string | null>(null)
  const dropIndicator = ref<TreeDropIndicator | null>(null)

  function clearDrag() {
    draggingId.value = null
    dropIndicator.value = null
  }

  function startDrag(nodeId: string) {
    draggingId.value = nodeId
  }

  function resolveDrop(
    flatNode: FlatCollectionNode,
    clientY: number,
    rowEl: HTMLElement,
  ): TreeDropIndicator | null {
    const node = nodes().find(n => n.id === flatNode.id)
    if (!node || !draggingId.value || draggingId.value === flatNode.id) {
      return null
    }

    const rect = rowEl.getBoundingClientRect()
    const ratio = (clientY - rect.top) / rect.height

    if (flatNode.kind === 'collection' || flatNode.kind === 'folder') {
      if (ratio < 0.25) {
        return { targetId: flatNode.id, position: 'before' }
      }
      if (ratio > 0.75) {
        return { targetId: flatNode.id, position: 'after' }
      }
      return { targetId: flatNode.id, position: 'inside' }
    }

    if (ratio < 0.5) {
      return { targetId: flatNode.id, position: 'before' }
    }
    return { targetId: flatNode.id, position: 'after' }
  }

  function updateDropIndicator(
    flatNode: FlatCollectionNode,
    clientY: number,
    rowEl: HTMLElement,
  ) {
    if (!draggingId.value) return
    dropIndicator.value = resolveDrop(flatNode, clientY, rowEl)
  }

  function buildMovePayload(indicator: TreeDropIndicator): CollectionMovePayload | null {
    const dragId = draggingId.value
    if (!dragId) return null

    const all = nodes()
    const target = all.find(n => n.id === indicator.targetId)
    if (!target) return null

    if (indicator.position === 'inside') {
      if (!canMoveNodeToParent(all, dragId, target.id)) return null
      return { nodeId: dragId, newParentId: target.id }
    }

    const newParentId = target.parentId
    if (!canMoveNodeToParent(all, dragId, newParentId)) return null

    if (indicator.position === 'before') {
      return { nodeId: dragId, newParentId, beforeSiblingId: target.id }
    }

    const siblings = all
      .filter(n => n.parentId === newParentId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    const targetIndex = siblings.findIndex(n => n.id === target.id)
    const nextSibling = siblings[targetIndex + 1]
    return {
      nodeId: dragId,
      newParentId,
      beforeSiblingId: nextSibling?.id,
    }
  }

  function commitDrop(): CollectionMovePayload | null {
    if (!dropIndicator.value) return null
    const payload = buildMovePayload(dropIndicator.value)
    clearDrag()
    return payload
  }

  function isDropTarget(nodeId: string): boolean {
    return dropIndicator.value?.targetId === nodeId
  }

  function dropPositionFor(nodeId: string): TreeDropPosition | null {
    if (dropIndicator.value?.targetId !== nodeId) return null
    return dropIndicator.value.position
  }

  return {
    draggingId,
    dropIndicator,
    startDrag,
    clearDrag,
    updateDropIndicator,
    commitDrop,
    isDropTarget,
    dropPositionFor,
  }
}
