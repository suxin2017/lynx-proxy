import type { ApiRequestDraft, ApiRequestSettings } from '../types'

export const DEFAULT_API_REQUEST_SETTINGS: ApiRequestSettings = {
  timeoutMs: 30_000,
  followRedirects: true,
  validateSsl: true,
}

export function createEmptyApiDraft(overrides: Partial<ApiRequestDraft> = {}): ApiRequestDraft {
  const { settings: settingsOverrides, cookies: cookiesOverrides, ...rest } = overrides
  return {
    name: 'Untitled',
    method: 'GET',
    url: '',
    queryParams: [],
    headers: [],
    body: '',
    cookies: cookiesOverrides ?? [],
    settings: {
      ...DEFAULT_API_REQUEST_SETTINGS,
      ...settingsOverrides,
    },
    timeout: 30,
    ...rest,
  }
}

export function composeDraftToApiDraft(
  draft: import('@/components/ui/compose/types').ComposeDraft,
  overrides: Partial<ApiRequestDraft> = {},
): ApiRequestDraft {
  return createEmptyApiDraft({
    name: draft.name,
    method: draft.method,
    url: draft.url,
    queryParams: draft.queryParams,
    headers: draft.headers,
    body: draft.body,
    timeout: draft.timeout,
    ...overrides,
  })
}
