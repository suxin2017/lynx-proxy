import type { ComposeDraft, KeyValueRow } from '../types'

/** Origin + path only; strips query and hash (for Params tab + send URL building). */
export function urlBaseWithoutQuery(urlString: string): string {
  const trimmed = urlString.trim()
  if (!trimmed) return ''

  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `http://${trimmed}`)
    url.search = ''
    url.hash = ''
    return url.toString()
  }
  catch {
    const noHash = trimmed.split('#')[0] ?? trimmed
    const q = noHash.indexOf('?')
    return q >= 0 ? noHash.slice(0, q) : noHash
  }
}

export function hasEnabledQueryParams(params: KeyValueRow[]): boolean {
  return params.some(param => param.enabled && param.key.trim())
}

/**
 * Merge Params into base URL (re-encodes values). Use when the address bar has no `?` yet.
 * Do not use for send when the bar already contains a signed/encoded query string.
 */
export function resolveRequestUrl(url: string, queryParams: KeyValueRow[]): string {
  const trimmed = url.trim()
  if (!trimmed) return ''
  if (!hasEnabledQueryParams(queryParams)) {
    return trimmed
  }
  return buildUrlWithParams(urlBaseWithoutQuery(trimmed), queryParams)
}

/**
 * URL used for HTTP send / cURL export.
 * When the address bar already has `?`, keep it byte-for-byte (signatures, encoding, order).
 */
export function composeRequestUrl(url: string, queryParams: KeyValueRow[]): string {
  const trimmed = url.trim()
  if (!trimmed) return ''
  if (trimmed.includes('?')) {
    return trimmed
  }
  if (hasEnabledQueryParams(queryParams)) {
    return buildUrlWithParams(trimmed, queryParams)
  }
  return trimmed
}

export function parseUrlParams(urlString: string): KeyValueRow[] {
  try {
    if (!urlString.trim()) {
      return []
    }

    const url = new URL(
      urlString.startsWith('http') ? urlString : `http://${urlString}`,
    )
    const params: KeyValueRow[] = []

    url.searchParams.forEach((value, key) => {
      params.push({ key, value, enabled: true })
    })

    return params
  }
  catch {
    return []
  }
}

export function buildUrlWithParams(baseUrl: string, params: KeyValueRow[]): string {
  try {
    const base = urlBaseWithoutQuery(baseUrl)
    if (!base) {
      return ''
    }

    const url = new URL(
      base.startsWith('http') ? base : `http://${base}`,
    )

    params
      .filter(param => param.enabled && param.key)
      .forEach((param) => {
        url.searchParams.set(param.key, param.value)
      })

    return url.toString()
  }
  catch {
    return baseUrl
  }
}

export function syncDraftUrlToParams(draft: ComposeDraft, url: string): ComposeDraft {
  return {
    ...draft,
    url,
    queryParams: parseUrlParams(url),
  }
}

export function syncDraftParamsToUrl(draft: ComposeDraft): ComposeDraft {
  return {
    ...draft,
    url: buildUrlWithParams(draft.url, draft.queryParams),
  }
}

/** Postman-style: address bar shows full URL; Params tab stays in sync. */
export function normalizeDraftUrlParams(draft: ComposeDraft): ComposeDraft {
  const trimmed = draft.url.trim()
  if (trimmed.includes('?')) {
    return syncDraftUrlToParams(draft, trimmed)
  }
  if (hasEnabledQueryParams(draft.queryParams)) {
    return syncDraftParamsToUrl(draft)
  }
  return draft
}
