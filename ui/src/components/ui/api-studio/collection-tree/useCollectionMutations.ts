import { inject, type Ref } from 'vue'
import type {
  ApiRequestDraft,
  CollectionCreateKind,
  CollectionMovePayload,
  CollectionNode,
  CollectionTreeAction,
  ComposeHttpMethod,
} from '../types'
import { COLLECTION_PERSISTENCE_KEY } from '../collection-persistence'
import { composeDraftToApiDraft, createEmptyApiDraft } from '../lib/empty-api-draft'

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function isBranchKind(kind: CollectionNode['kind']): boolean {
  return kind === 'collection' || kind === 'folder'
}

function siblingsOf(nodes: CollectionNode[], parentId: string | null): CollectionNode[] {
  return nodes.filter(n => n.parentId === parentId)
}

function nextOrder(nodes: CollectionNode[], parentId: string | null): number {
  const siblings = siblingsOf(nodes, parentId)
  const max = siblings.reduce((acc, n) => Math.max(acc, n.order ?? 0), -1)
  return max + 1
}

function descendantIds(nodes: CollectionNode[], rootId: string): Set<string> {
  const result = new Set<string>()
  const queue = [rootId]
  while (queue.length > 0) {
    const id = queue.pop()!
    for (const node of nodes) {
      if (node.parentId === id && !result.has(node.id)) {
        result.add(node.id)
        queue.push(node.id)
      }
    }
  }
  return result
}

export function canMoveNodeToParent(
  nodes: CollectionNode[],
  nodeId: string,
  newParentId: string | null,
): boolean {
  const node = nodes.find(n => n.id === nodeId)
  if (!node) return false

  if (nodeId === newParentId) return false

  if (newParentId === null) {
    return node.kind === 'collection'
  }

  const parent = nodes.find(n => n.id === newParentId)
  if (!parent || !isBranchKind(parent.kind)) return false

  if (node.kind === 'collection') return false

  const descendants = descendantIds(nodes, nodeId)
  if (descendants.has(newParentId)) return false

  return true
}

export function applyCollectionMove(
  nodes: CollectionNode[],
  payload: CollectionMovePayload,
): CollectionNode[] {
  const { nodeId, newParentId, beforeSiblingId } = payload
  if (!canMoveNodeToParent(nodes, nodeId, newParentId)) {
    return nodes
  }

  const targetSiblings = siblingsOf(nodes, newParentId).filter(n => n.id !== nodeId)
  let insertOrder = nextOrder(nodes, newParentId)

  if (beforeSiblingId) {
    const before = targetSiblings.find(n => n.id === beforeSiblingId)
    if (before) {
      insertOrder = before.order ?? 0
      return nodes.map((n) => {
        if (n.id === nodeId) {
          return { ...n, parentId: newParentId, order: insertOrder }
        }
        if (n.parentId === newParentId && n.id !== nodeId && (n.order ?? 0) >= insertOrder) {
          return { ...n, order: (n.order ?? 0) + 1 }
        }
        return n
      })
    }
  }

  return nodes.map(n =>
    n.id === nodeId ? { ...n, parentId: newParentId, order: insertOrder } : n,
  )
}

function defaultRequestName(method: ComposeHttpMethod, url: string): string {
  if (!url.trim()) return 'New Request'
  try {
    const parsed = new URL(url)
    const path = parsed.pathname.split('/').filter(Boolean).pop()
    return path ? `${method} ${path}` : `${method} ${parsed.host}`
  }
  catch {
    return `${method} Request`
  }
}

function toPersistedDraft(draft: ApiRequestDraft) {
  return {
    name: draft.name,
    method: draft.method,
    url: draft.url,
    queryParams: draft.queryParams,
    headers: draft.headers,
    body: draft.body,
    cookies: draft.cookies,
    settings: draft.settings,
    timeout: draft.timeout,
  }
}

export function useCollectionMutations(nodes: Ref<CollectionNode[]>) {
  const persistence = inject(COLLECTION_PERSISTENCE_KEY, null)

  function findNode(id: string) {
    return nodes.value.find(n => n.id === id)
  }

  function resolveParentForCreate(selectedId?: string): string | null {
    if (!selectedId) {
      const firstCol = nodes.value.find(n => n.kind === 'collection')
      return firstCol?.id ?? null
    }
    const selected = findNode(selectedId)
    if (!selected) return null
    if (selected.kind === 'collection' || selected.kind === 'folder') {
      return selected.id
    }
    return selected.parentId
  }

  async function create(
    kind: CollectionCreateKind,
    parentId?: string | null,
    selectedId?: string,
  ): Promise<CollectionNode | undefined> {
    const resolvedParent = parentId !== undefined
      ? parentId
      : kind === 'collection'
        ? null
        : resolveParentForCreate(selectedId)

    if (kind !== 'collection' && resolvedParent === null) {
      const col = await create('collection')
      if (!col) return undefined
      return create(kind, col.id, col.id)
    }

    if (persistence) {
      const apiKind = kind === 'collection' ? 'collection' : kind === 'folder' ? 'folder' : 'request'
      const name = kind === 'collection'
        ? 'New Collection'
        : kind === 'folder'
          ? 'New Folder'
          : 'New Request'
      return persistence.createNode({
        kind: apiKind,
        name,
        parentId: resolvedParent,
        method: kind === 'request' ? 'GET' : undefined,
      })
    }

    const id = newId(kind === 'collection' ? 'col' : kind === 'folder' ? 'folder' : 'req')
    const node: CollectionNode = {
      id,
      parentId: resolvedParent,
      kind: kind === 'collection' ? 'collection' : kind === 'folder' ? 'folder' : 'request',
      name: kind === 'collection' ? 'New Collection' : kind === 'folder' ? 'New Folder' : 'New Request',
      method: kind === 'request' ? 'GET' : undefined,
      draftId: kind === 'request' ? `draft-${id}` : undefined,
      order: nextOrder(nodes.value, resolvedParent),
    }
    nodes.value = [...nodes.value, node]
    return node
  }

  async function createRequestFromDraft(
    draft: ApiRequestDraft,
    parentId?: string | null,
    selectedId?: string,
  ): Promise<CollectionNode> {
    const resolvedParent = parentId ?? resolveParentForCreate(selectedId)
    if (resolvedParent === null) {
      const col = await create('collection')
      if (!col) {
        throw new Error('Failed to create collection')
      }
      return createRequestFromDraft(draft, col.id, col.id)
    }

    const name = draft.name?.trim() || defaultRequestName(draft.method, draft.url)

    if (persistence) {
      return persistence.createNode({
        kind: 'request',
        name,
        parentId: resolvedParent,
        method: draft.method,
        draft: toPersistedDraft(draft),
      })
    }

    const id = newId('req')
    const node: CollectionNode = {
      id,
      parentId: resolvedParent,
      kind: 'request',
      name,
      method: draft.method,
      draftId: `draft-${id}`,
      order: nextOrder(nodes.value, resolvedParent),
    }
    nodes.value = [...nodes.value, node]
    return node
  }

  async function move(payload: CollectionMovePayload) {
    if (!canMoveNodeToParent(nodes.value, payload.nodeId, payload.newParentId)) {
      return
    }

    if (persistence) {
      await persistence.moveNode(payload.nodeId, {
        newParentId: payload.newParentId,
        beforeSiblingId: payload.beforeSiblingId,
      })
      return
    }

    nodes.value = applyCollectionMove(nodes.value, payload)
  }

  async function renameNode(nodeId: string, name: string) {
    const trimmed = name.trim()
    if (!trimmed) return

    if (persistence) {
      await persistence.renameNode(nodeId, trimmed)
      return
    }

    nodes.value = nodes.value.map(n =>
      n.id === nodeId ? { ...n, name: trimmed } : n,
    )
  }

  async function handleTreeAction(
    action: CollectionTreeAction,
    node: CollectionNode,
    selectedId?: string,
  ) {
    switch (action) {
      case 'new-folder':
        if (isBranchKind(node.kind)) {
          await create('folder', node.id, node.id)
        }
        break
      case 'new-request':
        if (isBranchKind(node.kind)) {
          await create('request', node.id, node.id)
        }
        break
      case 'rename':
        break
      case 'duplicate': {
        if (persistence && node.kind === 'request' && node.draftId) {
          const draft = await persistence.loadDraft(node.draftId)
          await createRequestFromDraft(
            createEmptyApiDraft({ ...draft, name: `${node.name} (copy)` }),
            node.parentId,
          )
          break
        }
        const copyId = newId(node.kind === 'request' ? 'req' : node.kind === 'folder' ? 'folder' : 'col')
        const copy: CollectionNode = {
          ...node,
          id: copyId,
          name: `${node.name} (copy)`,
          draftId: node.draftId ? `draft-${copyId}` : undefined,
          order: nextOrder(nodes.value, node.parentId),
        }
        nodes.value = [...nodes.value, copy]
        break
      }
      case 'delete': {
        const toRemove = new Set([node.id, ...descendantIds(nodes.value, node.id)])
        const removedRequestNodeIds = nodes.value
          .filter(n => n.kind === 'request' && toRemove.has(n.id))
          .map(n => n.id)
        if (persistence) {
          await persistence.deleteNode(node.id)
        }
        else {
          nodes.value = nodes.value.filter(n => !toRemove.has(n.id))
        }
        return {
          clearedSelection: Boolean(selectedId && toRemove.has(selectedId)),
          removedRequestNodeIds,
        }
      }
      default:
        break
    }
    return { clearedSelection: false, removedRequestNodeIds: [] as string[] }
  }

  function apiDraftFromCompose(draft: import('@/components/ui/compose/types').ComposeDraft): ApiRequestDraft {
    return composeDraftToApiDraft(draft, { name: draft.name })
  }

  return {
    create,
    move,
    renameNode,
    findNode,
    createRequestFromDraft,
    handleTreeAction,
    apiDraftFromCompose,
    canMoveNodeToParent: (nodeId: string, newParentId: string | null) =>
      canMoveNodeToParent(nodes.value, nodeId, newParentId),
  }
}
