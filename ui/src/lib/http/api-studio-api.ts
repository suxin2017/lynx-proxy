import { authHeaders } from '@/lib/auth/token'
import type { ServerApiStudioDraft } from '@/lib/api-studio/draft-mapper'
import type {
  ApiRequestDraft,
  ApiRequestHistoryEntry,
  CollectionNode,
  ComposeResponse,
} from '@/components/ui/api-studio/types'
import type { ComposeHttpMethod } from '@/components/ui/compose/types'

const API_BASE = '/api/api_studio'

function parseErrorMessage(status: number, text: string): string {
  const trimmed = text.trim()
  if (!trimmed) {
    return `HTTP ${status}`
  }
  if (trimmed.startsWith('{')) {
    try {
      const body = JSON.parse(trimmed) as { message?: string }
      if (body.message) {
        return body.message
      }
    }
    catch {
      // fall through
    }
  }
  return trimmed
}

async function parseJsonBody<T>(response: Response): Promise<T> {
  const text = await response.text()
  if (!text.trim()) {
    return undefined as T
  }
  try {
    return JSON.parse(text) as T
  }
  catch {
    throw new SyntaxError(
      `Server returned non-JSON (HTTP ${response.status}): ${text.slice(0, 120)}`,
    )
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...init?.headers,
    },
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(parseErrorMessage(response.status, text))
  }
  if (response.status === 204) {
    return undefined as T
  }
  return parseJsonBody<T>(response)
}

export interface CollectionListResponse {
  nodes: CollectionNode[]
}

export interface HistoryListResponse {
  entries: ApiRequestHistoryEntry[]
}

export interface CreateCollectionNodeBody {
  kind: 'collection' | 'folder' | 'request'
  name: string
  parentId?: string | null
  method?: ComposeHttpMethod
  draft?: Omit<ApiRequestDraft, 'cookies' | 'settings'> & {
    cookies?: ApiRequestDraft['cookies']
    settings?: ApiRequestDraft['settings']
  }
}

export interface MoveCollectionNodeBody {
  newParentId: string | null
  beforeSiblingId?: string
}

export interface RenameCollectionNodeBody {
  name: string
}

export interface CreateHistoryEntryBody {
  sentAt?: number
  method: ComposeHttpMethod
  url: string
  status?: number
  statusText?: string
  durationMs?: number
  draft: ApiRequestDraft
  response?: ComposeResponse
  requestNodeId?: string
  tabId?: string
}

export function fetchCollectionNodes(): Promise<CollectionListResponse> {
  return request('/collections')
}

export function createCollectionNode(
  body: CreateCollectionNodeBody,
): Promise<CollectionNode> {
  return request('/collections/nodes', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function renameCollectionNode(
  id: string,
  body: RenameCollectionNodeBody,
): Promise<CollectionNode> {
  return request(`/collections/nodes/${encodeURIComponent(id)}/rename`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function moveCollectionNode(
  id: string,
  body: MoveCollectionNodeBody,
): Promise<CollectionNode> {
  return request(`/collections/nodes/${encodeURIComponent(id)}/move`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function deleteCollectionNode(id: string): Promise<void> {
  return request(`/collections/nodes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export function fetchDraft(id: string): Promise<ServerApiStudioDraft> {
  return request(`/drafts/${encodeURIComponent(id)}`)
}

export function saveDraft(id: string, draft: ApiRequestDraft): Promise<ServerApiStudioDraft> {
  return request(`/drafts/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: draft.name,
      method: draft.method,
      url: draft.url,
      queryParams: draft.queryParams,
      headers: draft.headers,
      body: draft.body,
      cookies: draft.cookies,
      settings: draft.settings,
      timeout: draft.timeout,
    }),
  })
}

export function fetchRequestHistory(limit = 100): Promise<HistoryListResponse> {
  return request(`/history?limit=${limit}`)
}

export function appendRequestHistory(
  body: CreateHistoryEntryBody,
): Promise<ApiRequestHistoryEntry> {
  return request('/history', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function deleteRequestHistoryEntry(id: string): Promise<void> {
  return request(`/history/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function clearRequestHistory(): Promise<{ deleted: number }> {
  return request('/history/clear', { method: 'DELETE' })
}
