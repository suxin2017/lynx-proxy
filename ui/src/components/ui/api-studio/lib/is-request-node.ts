import type { CollectionNode } from '../types'

/** True for API request leaves (kind or persisted draft id). */
export function isRequestNode(node: CollectionNode): boolean {
  if (node.draftId) {
    return true
  }
  const kind = String(node.kind ?? '').toLowerCase()
  return kind === 'request'
}
