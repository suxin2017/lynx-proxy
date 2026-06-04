import type { NetworkDetailKeyValue } from '@/components/ui/network-request-detail'
import type { PartialRequestRecord } from '@/stores/modules/request-stream-logic'
import { resolveRequestUrl } from '@/lib/http/request-url'

export interface RequestFactsPayload {
  scheme?: string
  host: string
  port?: number
  path: string
  query?: string
  method: string
  headers: [string, string][]
}

function headersFromKeyValues(rows: NetworkDetailKeyValue[] | undefined): [string, string][] {
  if (!rows?.length) {
    return []
  }

  const headers = rows
    .filter(row => row.key.trim().length > 0)
    .map((row): [string, string] => [row.key.toLowerCase(), row.value ?? ''])

  headers.sort(([left], [right]) => left.localeCompare(right))
  return headers
}

function headersToRecord(headers: [string, string][]): Record<string, string> {
  const record: Record<string, string> = {}
  for (const [key, value] of headers) {
    record[key] = value
  }
  return record
}

function hostAndPort(
  uriHost: string | undefined,
  uriPort: number | undefined,
  headers: [string, string][],
): { host: string, port?: number } {
  if (uriHost) {
    return { host: uriHost, port: uriPort }
  }

  const hostValue = headers.find(([key]) => key === 'host')?.[1] ?? ''
  const separatorIndex = hostValue.lastIndexOf(':')
  if (separatorIndex > 0) {
    const host = hostValue.slice(0, separatorIndex)
    const portText = hostValue.slice(separatorIndex + 1)
    const port = Number.parseInt(portText, 10)
    if (Number.isFinite(port) && port > 0 && port <= 65535) {
      return { host, port }
    }
  }

  return { host: hostValue, port: undefined }
}

function extractExplicitPort(resolvedUrl: string): number | undefined {
  const match = resolvedUrl.match(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*:(\d+)/i)
  if (!match) {
    return undefined
  }

  const port = Number.parseInt(match[1], 10)
  return Number.isFinite(port) && port > 0 && port <= 65535 ? port : undefined
}

function parseResolvedUrl(resolvedUrl: string): {
  scheme?: string
  host?: string
  port?: number
  path: string
  query?: string
} {
  try {
    const parsed = new URL(resolvedUrl)
    const parsedPort = parsed.port ? Number.parseInt(parsed.port, 10) : undefined
    const port = Number.isFinite(parsedPort)
      ? parsedPort
      : extractExplicitPort(resolvedUrl)
    return {
      scheme: parsed.protocol.replace(/:$/, '') || undefined,
      host: parsed.hostname || undefined,
      port,
      path: parsed.pathname || '/',
      query: parsed.search ? parsed.search.slice(1) : undefined,
    }
  }
  catch {
    return { path: '/' }
  }
}

export function requestFactsFromPartialRecord(record: PartialRequestRecord): RequestFactsPayload {
  const headers = headersFromKeyValues(record.requestHeaders)
  const headerRecord = headersToRecord(headers)
  const resolvedUrl = resolveRequestUrl({
    url: record.url,
    method: record.method,
    headers: headerRecord,
  })

  const parsed = resolvedUrl ? parseResolvedUrl(resolvedUrl) : { path: '/' }
  const { host, port } = hostAndPort(parsed.host, parsed.port, headers)

  return {
    scheme: parsed.scheme,
    host,
    port,
    path: parsed.path || '/',
    query: parsed.query,
    method: (record.method ?? 'GET').toUpperCase(),
    headers,
  }
}

export function requestFactsCacheKey(traceId: string, record: PartialRequestRecord): string {
  return [
    traceId,
    record.url ?? '',
    record.method ?? '',
    record.requestHeaders?.map(row => `${row.key}:${row.value}`).join('\n') ?? '',
  ].join('\0')
}
