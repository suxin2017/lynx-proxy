import type { NetworkDetailKeyValue } from '@/components/ui/network-request-detail'

export function readHeaderValue(
  headers: Record<string, string> | undefined,
  key: string,
): string | undefined {
  if (!headers) {
    return undefined
  }

  const lowerKey = key.toLowerCase()
  const match = Object.entries(headers).find(([name]) => name.toLowerCase() === lowerKey)
  return match?.[1]
}

/**
 * Parse a request `Cookie` header into name/value rows.
 * Example: `a=1; b=2` -> [{ key: 'a', value: '1' }, { key: 'b', value: '2' }]
 */
export function parseCookieHeader(cookieHeader: string): NetworkDetailKeyValue[] {
  const trimmed = cookieHeader.trim()
  if (!trimmed) {
    return []
  }

  return trimmed
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separatorIndex = part.indexOf('=')
      if (separatorIndex <= 0) {
        return { key: part, value: '' }
      }

      return {
        key: part.slice(0, separatorIndex).trim(),
        value: part.slice(separatorIndex + 1).trim(),
      }
    })
    .filter(row => row.key.length > 0)
}

/**
 * Parse a response `Set-Cookie` header value into name/value rows (v1).
 * Only keeps the cookie pair before the first `;` (attributes ignored).
 */
export function parseSetCookieHeader(setCookieHeader: string): NetworkDetailKeyValue[] {
  const trimmed = setCookieHeader.trim()
  if (!trimmed) {
    return []
  }

  const chunks = trimmed.includes('\n')
    ? trimmed.split('\n')
    : [trimmed]

  const rows: NetworkDetailKeyValue[] = []

  for (const chunk of chunks) {
    const pair = chunk.trim().split(';')[0]?.trim()
    if (!pair) {
      continue
    }

    const separatorIndex = pair.indexOf('=')
    if (separatorIndex <= 0) {
      rows.push({ key: pair, value: '' })
      continue
    }

    rows.push({
      key: pair.slice(0, separatorIndex).trim(),
      value: pair.slice(separatorIndex + 1).trim(),
    })
  }

  return rows
}

export function deriveRequestCookies(
  headers: Record<string, string> | undefined,
): NetworkDetailKeyValue[] {
  return parseCookieHeader(readHeaderValue(headers, 'cookie') ?? '')
}

export function deriveResponseCookies(
  headers: Record<string, string> | undefined,
): NetworkDetailKeyValue[] {
  return parseSetCookieHeader(readHeaderValue(headers, 'set-cookie') ?? '')
}
