const readString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const isWebSocketUpgrade = (headers: Record<string, string> | undefined): boolean => {
  if (!headers) {
    return false
  }

  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() === 'upgrade' && value.toLowerCase().includes('websocket')) {
      return true
    }
  }

  return false
}

const readHeaderHost = (headers: Record<string, string> | undefined): string | undefined => {
  if (!headers) {
    return undefined
  }

  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() === 'host' && value.trim().length > 0) {
      return value.trim()
    }
  }

  return undefined
}

export function normalizeRequestUrl(
  raw: string,
  method = 'GET',
  headers?: Record<string, string>,
): string | undefined {
  const trimmed = raw.trim()
  if (!trimmed) {
    return undefined
  }

  if (/^(https?|wss?):\/\//i.test(trimmed)) {
    if (/^https:\/\//i.test(trimmed) && isWebSocketUpgrade(headers)) {
      return trimmed.replace(/^https:\/\//i, 'wss://')
    }
    return trimmed
  }

  const upperMethod = method.toUpperCase()

  if (upperMethod === 'CONNECT') {
    return trimmed.startsWith('//') ? `https:${trimmed}` : `https://${trimmed}`
  }

  if (trimmed.startsWith('/')) {
    const host = readHeaderHost(headers)
    if (!host) {
      return trimmed
    }
    const scheme = isWebSocketUpgrade(headers) && (host.endsWith(':443') || !host.includes(':'))
      ? 'wss'
      : 'http'
    return `${scheme}://${host}${trimmed}`
  }

  if (trimmed.includes('://')) {
    return trimmed
  }

  return `http://${trimmed}`
}

export function resolveRequestUrl(input: {
  url?: unknown
  uri?: unknown
  method?: string
  headers?: Record<string, string> | unknown
}): string | undefined {
  const method = typeof input.method === 'string' ? input.method : 'GET'
  const headers = isHeaderMap(input.headers) ? input.headers : undefined
  const raw = readString(input.url) ?? readString(input.uri)

  if (raw) {
    return normalizeRequestUrl(raw, method, headers)
  }

  const host = readHeaderHost(headers)
  if (!host) {
    return undefined
  }

  return normalizeRequestUrl(host, method, headers)
}

export function resolveSnapshotRequestUrl(snapshot: {
  request?: {
    method?: string
    url?: string
    headers?: Record<string, string>
  }
}): string | undefined {
  if (!snapshot.request) {
    return undefined
  }

  return resolveRequestUrl({
    url: snapshot.request.url,
    method: snapshot.request.method,
    headers: snapshot.request.headers,
  })
}

export function displayRequestUrl(url: string | undefined, traceId: string): string {
  if (url && url.length > 0 && !url.startsWith('trace://')) {
    return url
  }

  return traceId ? `请求 ${traceId.slice(0, 8)}…` : '—'
}

function isHeaderMap(value: unknown): value is Record<string, string> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
