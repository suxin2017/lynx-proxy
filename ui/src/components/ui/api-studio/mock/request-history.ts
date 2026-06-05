import type { ApiRequestHistoryEntry } from '../types'
import { createEmptyApiDraft } from '../lib/empty-api-draft'
import { MOCK_REQUEST_DRAFTS } from './request-drafts'

const now = Date.now()

export const MOCK_HISTORY_ENTRIES: ApiRequestHistoryEntry[] = [
  {
    id: 'hist-login-201',
    sentAt: now - 45_000,
    method: 'POST',
    url: 'https://gateway.lynx.internal/v1/auth/login',
    status: 201,
    statusText: 'Created',
    durationMs: 128,
    draft: structuredClone(MOCK_REQUEST_DRAFTS['draft-login']),
    requestNodeId: 'req-login',
    tabId: 'tab-req-login',
  },
  {
    id: 'hist-users-200',
    sentAt: now - 3 * 60_000,
    method: 'GET',
    url: 'https://gateway.lynx.internal/v1/users?page=1&limit=20',
    status: 200,
    statusText: 'OK',
    durationMs: 84,
    draft: structuredClone(MOCK_REQUEST_DRAFTS['draft-list-users']),
    requestNodeId: 'req-list-users',
  },
  {
    id: 'hist-user-404',
    sentAt: now - 8 * 60_000,
    method: 'GET',
    url: 'https://gateway.lynx.internal/v1/users/99999',
    status: 404,
    statusText: 'Not Found',
    durationMs: 52,
    draft: structuredClone(MOCK_REQUEST_DRAFTS['draft-get-user']),
  },
  {
    id: 'hist-update-500',
    sentAt: now - 22 * 60_000,
    method: 'PATCH',
    url: 'https://gateway.lynx.internal/v1/users/42',
    status: 500,
    statusText: 'Internal Server Error',
    durationMs: 1204,
    draft: structuredClone(MOCK_REQUEST_DRAFTS['draft-update-user']),
  },
  {
    id: 'hist-refresh-401',
    sentAt: now - 2 * 3600_000,
    method: 'POST',
    url: 'https://gateway.lynx.internal/v1/auth/refresh',
    status: 401,
    statusText: 'Unauthorized',
    durationMs: 31,
    draft: structuredClone(MOCK_REQUEST_DRAFTS['draft-refresh']),
  },
]

export function generateHistoryEntries(count: number): ApiRequestHistoryEntry[] {
  const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const
  return Array.from({ length: count }, (_, i) => {
    const method = methods[i % methods.length]!
    const status = i % 5 === 0 ? 500 : i % 4 === 0 ? 404 : 200
    return {
      id: `hist-gen-${i}`,
      sentAt: now - i * 90_000,
      method,
      url: `https://api.example.com/v1/resource/${i}?q=demo`,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      durationMs: 40 + (i % 7) * 20,
      draft: createEmptyApiDraft({
        name: `Generated ${i}`,
        method,
        url: `https://api.example.com/v1/resource/${i}`,
      }),
    }
  })
}
