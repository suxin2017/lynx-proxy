import { computed, ref } from 'vue'

export const RULE_DRAG_MIME = 'application/x-lynx-rule-id'
export const RULE_DRAG_IDS_MIME = 'application/x-lynx-rule-ids'

/** Active rule ids while a list drag is in progress (for cross-panel drop detection). */
export const draggingRuleIds = ref<string[]>([])

/** @deprecated Use draggingRuleIds */
export const draggingRuleId = computed({
  get: () => draggingRuleIds.value[0] ?? null,
  set: (value: string | null) => {
    draggingRuleIds.value = value ? [value] : []
  },
})

/** Set when a rule is dropped onto the project sidebar (skip in-list reorder). */
export const externalRuleDropHandled = ref(false)

export function isRuleDragEvent(ev: DragEvent): boolean {
  if (draggingRuleIds.value.length > 0) return true
  const types = ev.dataTransfer?.types
  if (!types) return false
  const list = Array.from(types)
  return list.includes(RULE_DRAG_MIME) || list.includes(RULE_DRAG_IDS_MIME)
}

function parseDraggedIdsFromDataTransfer(ev: DragEvent): string[] {
  const rawIds = ev.dataTransfer?.getData(RULE_DRAG_IDS_MIME)
  if (rawIds) {
    try {
      const parsed = JSON.parse(rawIds) as unknown
      if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
        return parsed
      }
    }
    catch {
      // fall through
    }
  }

  const single = ev.dataTransfer?.getData(RULE_DRAG_MIME)
    || ev.dataTransfer?.getData('text/plain')
  return single ? [single] : []
}

export function readDraggedRuleIds(ev: DragEvent): string[] {
  const fromTransfer = parseDraggedIdsFromDataTransfer(ev)
  if (fromTransfer.length > 0) {
    return fromTransfer
  }
  return [...draggingRuleIds.value]
}

/** @deprecated Use readDraggedRuleIds */
export function readDraggedRuleId(ev: DragEvent): string | null {
  return readDraggedRuleIds(ev)[0] ?? null
}

export function setRuleDragData(dataTransfer: DataTransfer, ruleIds: string[]) {
  if (ruleIds.length === 0) return
  const primary = ruleIds[0]
  dataTransfer.setData(RULE_DRAG_MIME, primary)
  dataTransfer.setData(RULE_DRAG_IDS_MIME, JSON.stringify(ruleIds))
  dataTransfer.setData('text/plain', primary)
  dataTransfer.effectAllowed = 'move'
}

export function clearDraggingRuleIds() {
  draggingRuleIds.value = []
}
