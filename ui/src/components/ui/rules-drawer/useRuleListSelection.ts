import { computed, ref } from 'vue'

export interface RuleListSelectionState {
  selectedIds: Set<string>
  anchorId: string | null
}

export function createRuleListSelectionState(): RuleListSelectionState {
  return {
    selectedIds: new Set<string>(),
    anchorId: null,
  }
}

/** Pure selection update for unit tests. */
export function applyRuleListClick(
  state: RuleListSelectionState,
  id: string,
  index: number,
  orderedIds: string[],
  ev: Pick<MouseEvent, 'shiftKey' | 'metaKey' | 'ctrlKey'>,
): RuleListSelectionState {
  const next = {
    selectedIds: new Set(state.selectedIds),
    anchorId: state.anchorId,
  }

  const isRange = ev.shiftKey
  const isToggle = ev.metaKey || ev.ctrlKey

  if (isRange) {
    const anchorIndex = next.anchorId == null
      ? index
      : orderedIds.indexOf(next.anchorId)
    const from = anchorIndex < 0 ? index : Math.min(anchorIndex, index)
    const to = anchorIndex < 0 ? index : Math.max(anchorIndex, index)
    next.selectedIds = new Set(orderedIds.slice(from, to + 1))
    if (next.anchorId == null) {
      next.anchorId = id
    }
    return next
  }

  if (isToggle) {
    if (next.selectedIds.has(id)) {
      next.selectedIds.delete(id)
    }
    else {
      next.selectedIds.add(id)
    }
    next.anchorId = id
    return next
  }

  next.selectedIds = new Set([id])
  next.anchorId = id
  return next
}

export function useRuleListSelection() {
  const selectedIds = ref<Set<string>>(new Set())
  const anchorId = ref<string | null>(null)

  const selectedCount = computed(() => selectedIds.value.size)

  function isSelected(id: string) {
    return selectedIds.value.has(id)
  }

  function selectSingle(id: string) {
    selectedIds.value = new Set([id])
    anchorId.value = id
  }

  function toggleSelected(id: string) {
    const next = new Set(selectedIds.value)
    if (next.has(id)) {
      next.delete(id)
    }
    else {
      next.add(id)
    }
    selectedIds.value = next
    anchorId.value = id
  }

  function setSelected(ids: string[]) {
    selectedIds.value = new Set(ids)
    anchorId.value = ids.at(-1) ?? null
  }

  function clearSelection() {
    selectedIds.value = new Set()
    anchorId.value = null
  }

  function isAllSelected(ids: string[]) {
    if (ids.length === 0) return false
    for (const id of ids) {
      if (!selectedIds.value.has(id)) return false
    }
    return true
  }

  function isAnySelected(ids: string[]) {
    for (const id of ids) {
      if (selectedIds.value.has(id)) return true
    }
    return false
  }

  function pruneSelection(visibleIds: string[]) {
    const visible = new Set(visibleIds)
    const next = new Set<string>()
    for (const id of selectedIds.value) {
      if (visible.has(id)) {
        next.add(id)
      }
    }
    selectedIds.value = next
    if (anchorId.value && !visible.has(anchorId.value)) {
      anchorId.value = next.size > 0 ? [...next].at(-1) ?? null : null
    }
  }

  function handleRuleClick(id: string, index: number, orderedIds: string[], ev: MouseEvent) {
    const next = applyRuleListClick(
      { selectedIds: selectedIds.value, anchorId: anchorId.value },
      id,
      index,
      orderedIds,
      ev,
    )
    selectedIds.value = next.selectedIds
    anchorId.value = next.anchorId
  }

  function getSelectedInListOrder(orderedIds: string[]) {
    return orderedIds.filter(id => selectedIds.value.has(id))
  }

  function idsForDrag(draggedId: string, orderedIds: string[]) {
    const ordered = getSelectedInListOrder(orderedIds)
    if (ordered.length > 1 && ordered.includes(draggedId)) {
      return ordered
    }
    return [draggedId]
  }

  return {
    selectedIds,
    anchorId,
    selectedCount,
    isSelected,
    selectSingle,
    toggleSelected,
    setSelected,
    clearSelection,
    isAllSelected,
    isAnySelected,
    pruneSelection,
    handleRuleClick,
    getSelectedInListOrder,
    idsForDrag,
  }
}
