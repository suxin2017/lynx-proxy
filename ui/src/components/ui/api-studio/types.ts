import type { ComposeDraft, ComposeHttpMethod, ComposeResponse, KeyValueRow } from '@/components/ui/compose/types'

export type { ComposeHttpMethod, ComposeResponse, KeyValueRow }

export type CollectionNodeKind = 'collection' | 'folder' | 'request'

export type CollectionCreateKind = 'collection' | 'folder' | 'request'

export interface CollectionNode {
  id: string
  parentId: string | null
  kind: CollectionNodeKind
  name: string
  method?: ComposeHttpMethod
  draftId?: string
  /** Sibling order within the same parent (lower first). */
  order?: number
}

export type ApiStudioSidebarView = 'collections' | 'history'

export interface CollectionMovePayload {
  nodeId: string
  newParentId: string | null
  /** Insert before this sibling id, or append when undefined */
  beforeSiblingId?: string
}

export interface ApiRequestHistoryEntry {
  id: string
  sentAt: number
  method: ComposeHttpMethod
  url: string
  status?: number
  statusText?: string
  durationMs?: number
  draft: ApiRequestDraft
  /** Full response body captured at send time (when available). */
  response?: ComposeResponse | null
  requestNodeId?: string
  tabId?: string
}

export interface ApiRequestSettings {
  timeoutMs: number
  followRedirects: boolean
  validateSsl: boolean
}

export interface ApiRequestDraft extends ComposeDraft {
  cookies: KeyValueRow[]
  settings: ApiRequestSettings
}

export type ApiRequestTab = 'params' | 'headers' | 'body' | 'cookies' | 'settings'

export type ApiRequestLayout = 'vertical' | 'horizontal'

export interface FlatCollectionNode {
  id: string
  parentId: string | null
  kind: CollectionNodeKind
  name: string
  method?: ComposeHttpMethod
  draftId?: string
  depth: number
  hasChildren: boolean
  expanded: boolean
}

export type CollectionTreeAction =
  | 'rename'
  | 'duplicate'
  | 'delete'
  | 'new-folder'
  | 'new-request'

/** Open request tab in API Studio shell (Postman-style). */
export interface ApiStudioOpenTab {
  id: string
  requestNodeId: string
  title: string
  method?: ComposeHttpMethod
  draft: ApiRequestDraft
  response?: ComposeResponse | null
  loading?: boolean
  error?: string | null
  activeRequestTab?: ApiRequestTab
  /** Latest server history row for this tab (used to restore response after reload). */
  lastHistoryEntryId?: string
  dirty?: boolean
}
