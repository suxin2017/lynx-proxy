import type { CollectionNode } from '../types'

export const MOCK_COLLECTION_NODES: CollectionNode[] = [
  { id: 'col-lynx', parentId: null, kind: 'collection', name: 'Lynx Gateway' },
  { id: 'folder-auth', parentId: 'col-lynx', kind: 'folder', name: 'Auth' },
  { id: 'req-login', parentId: 'folder-auth', kind: 'request', name: 'Login', method: 'POST', draftId: 'draft-login' },
  { id: 'req-refresh', parentId: 'folder-auth', kind: 'request', name: 'Refresh Token', method: 'POST', draftId: 'draft-refresh' },
  { id: 'folder-users', parentId: 'col-lynx', kind: 'folder', name: 'Users' },
  { id: 'folder-users-v1', parentId: 'folder-users', kind: 'folder', name: 'v1' },
  { id: 'req-list-users', parentId: 'folder-users-v1', kind: 'request', name: 'List Users', method: 'GET', draftId: 'draft-list-users' },
  { id: 'req-get-user', parentId: 'folder-users-v1', kind: 'request', name: 'Get User', method: 'GET', draftId: 'draft-get-user' },
  { id: 'req-update-user', parentId: 'folder-users-v1', kind: 'request', name: 'Update User', method: 'PUT', draftId: 'draft-update-user' },
  { id: 'col-partner', parentId: null, kind: 'collection', name: 'Partner API' },
  { id: 'req-health', parentId: 'col-partner', kind: 'request', name: 'Health Check', method: 'GET', draftId: 'draft-health' },
  { id: 'req-webhook', parentId: 'col-partner', kind: 'request', name: 'Webhook Callback', method: 'POST', draftId: 'draft-webhook' },
]

export function generateLargeCollectionNodes(count: number): CollectionNode[] {
  const nodes: CollectionNode[] = [
    { id: 'col-large', parentId: null, kind: 'collection', name: 'Large Collection' },
  ]

  const folderCount = Math.max(3, Math.floor(count / 15))
  for (let f = 0; f < folderCount; f += 1) {
    const folderId = `folder-${f}`
    nodes.push({
      id: folderId,
      parentId: 'col-large',
      kind: 'folder',
      name: `Module ${f + 1}`,
    })

    const requestsPerFolder = Math.ceil((count - folderCount - 1) / folderCount)
    for (let r = 0; r < requestsPerFolder; r += 1) {
      const idx = f * requestsPerFolder + r
      if (idx >= count - folderCount - 1) break
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const
      nodes.push({
        id: `req-large-${idx}`,
        parentId: folderId,
        kind: 'request',
        name: `Request ${idx + 1}`,
        method: methods[idx % methods.length],
        draftId: `draft-large-${idx}`,
      })
    }
  }

  return nodes
}
