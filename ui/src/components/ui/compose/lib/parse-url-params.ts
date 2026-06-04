import type { ComposeDraft, KeyValueRow } from '../types'

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
    if (!baseUrl.trim()) {
      return ''
    }

    const [urlPart] = baseUrl.split('?')
    const url = new URL(
      urlPart.startsWith('http') ? urlPart : `http://${urlPart}`,
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
