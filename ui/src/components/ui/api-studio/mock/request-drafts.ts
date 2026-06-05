import type { ApiRequestDraft } from '../types'
import { createEmptyApiDraft } from '../lib/empty-api-draft'

export const MOCK_REQUEST_DRAFTS: Record<string, ApiRequestDraft> = {
  'draft-login': createEmptyApiDraft({
    name: 'Login',
    method: 'POST',
    url: 'https://gateway.lynx.internal/v1/auth/login',
    headers: [
      { key: 'content-type', value: 'application/json', enabled: true },
    ],
    body: JSON.stringify({ email: 'user@example.com', password: '***' }, null, 2),
    cookies: [{ key: 'X-Device-Id', value: 'demo-device', enabled: true }],
  }),
  'draft-refresh': createEmptyApiDraft({
    name: 'Refresh Token',
    method: 'POST',
    url: 'https://gateway.lynx.internal/v1/auth/refresh',
    headers: [
      { key: 'content-type', value: 'application/json', enabled: true },
    ],
    body: JSON.stringify({ refreshToken: 'rt_demo' }, null, 2),
  }),
  'draft-list-users': createEmptyApiDraft({
    name: 'List Users',
    method: 'GET',
    url: 'https://gateway.lynx.internal/v1/users?page=1&limit=20',
    queryParams: [
      { key: 'page', value: '1', enabled: true },
      { key: 'limit', value: '20', enabled: true },
    ],
    cookies: [{ key: 'session', value: 'sess_demo', enabled: true }],
  }),
  'draft-get-user': createEmptyApiDraft({
    name: 'Get User',
    method: 'GET',
    url: 'https://gateway.lynx.internal/v1/users/42',
  }),
  'draft-update-user': createEmptyApiDraft({
    name: 'Update User',
    method: 'PUT',
    url: 'https://gateway.lynx.internal/v1/users/42',
    headers: [{ key: 'content-type', value: 'application/json', enabled: true }],
    body: JSON.stringify({ displayName: 'Lynx User' }, null, 2),
  }),
  'draft-health': createEmptyApiDraft({
    name: 'Health Check',
    method: 'GET',
    url: 'https://api.partner-net.io/health',
  }),
  'draft-webhook': createEmptyApiDraft({
    name: 'Webhook Callback',
    method: 'POST',
    url: 'https://api.partner-net.io/v1/webhooks/callback',
    headers: [{ key: 'content-type', value: 'application/json', enabled: true }],
    body: JSON.stringify({ event: 'order.created', id: 'ord_001' }, null, 2),
    settings: {
      timeoutMs: 10_000,
      followRedirects: false,
      validateSsl: true,
    },
  }),
}

export function draftForNode(draftId: string | undefined): ApiRequestDraft {
  if (draftId && MOCK_REQUEST_DRAFTS[draftId]) {
    return structuredClone(MOCK_REQUEST_DRAFTS[draftId])
  }
  return createEmptyApiDraft()
}
