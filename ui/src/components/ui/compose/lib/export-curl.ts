import type { ComposeDraft } from '../types'

const SKIP_HEADERS = new Set(['connection', 'content-length', 'accept-encoding'])

function enabledHeaders(draft: ComposeDraft): Record<string, string> {
  const headers: Record<string, string> = {}

  for (const row of draft.headers) {
    if (!row.enabled || !row.key) {
      continue
    }
    headers[row.key] = row.value
  }

  if (draft.body.trim() && !Object.keys(headers).some(k => k.toLowerCase() === 'content-type')) {
    headers['Content-Type'] = 'application/json'
  }

  return headers
}

export function exportDraftToCurl(draft: ComposeDraft): string {
  const url = draft.url.trim()
  if (!url) {
    return ''
  }

  const headers = enabledHeaders(draft)
  let curlCommand = `curl '${url.replace(/'/g, '\'\\\'\'')}'`

  if (draft.method !== 'GET') {
    curlCommand += ` \\\n  -X ${draft.method}`
  }

  for (const [key, value] of Object.entries(headers)) {
    if (SKIP_HEADERS.has(key.toLowerCase())) {
      continue
    }
    const safeValue = value.replace(/'/g, '\'\\\'\'')
    curlCommand += ` \\\n  -H '${key}: ${safeValue}'`
  }

  if (draft.body.trim()) {
    const contentType = Object.entries(headers).find(([k]) => k.toLowerCase() === 'content-type')?.[1] ?? ''
    const safeBody = draft.body.replace(/'/g, '\'\\\'\'')

    if (contentType.includes('application/json')) {
      curlCommand += ` \\\n  -d '${safeBody}'`
    }
    else if (contentType.includes('application/x-www-form-urlencoded')) {
      curlCommand += ` \\\n  --data '${safeBody}'`
    }
    else {
      curlCommand += ` \\\n  --data-binary '${safeBody}'`
    }
  }

  return curlCommand
}
