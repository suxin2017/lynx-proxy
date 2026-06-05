import { describe, expect, it } from 'vitest'
import type { CollectionNode } from '../types'
import { applyCollectionMove, canMoveNodeToParent } from './useCollectionMutations'

const sampleNodes: CollectionNode[] = [
  { id: 'col', parentId: null, kind: 'collection', name: 'Root' },
  { id: 'folder', parentId: 'col', kind: 'folder', name: 'Folder' },
  { id: 'req', parentId: 'folder', kind: 'request', name: 'Req', method: 'GET' },
]

describe('canMoveNodeToParent', () => {
  it('allows request into folder', () => {
    expect(canMoveNodeToParent(sampleNodes, 'req', 'col')).toBe(true)
  })

  it('blocks moving folder into its descendant', () => {
    const nodes: CollectionNode[] = [
      { id: 'col', parentId: null, kind: 'collection', name: 'Root' },
      { id: 'folder', parentId: 'col', kind: 'folder', name: 'Folder' },
      { id: 'nested', parentId: 'folder', kind: 'folder', name: 'Nested' },
    ]
    expect(canMoveNodeToParent(nodes, 'folder', 'nested')).toBe(false)
  })
})

describe('applyCollectionMove', () => {
  it('updates parentId for request', () => {
    const next = applyCollectionMove(sampleNodes, {
      nodeId: 'req',
      newParentId: 'col',
    })
    expect(next.find(n => n.id === 'req')?.parentId).toBe('col')
  })
})
