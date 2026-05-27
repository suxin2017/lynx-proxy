import type { NetworkDetailRecord } from '@/components/ui/network-request-detail/types'

import type { ComposeDraft, KeyValueRow } from '../types'
import { createEmptyDraft } from './empty-draft'
import { parseUrlParams } from './parse-url-params'

const PSEUDO_HEADERS = new Set([
  ':method',
  ':path',
  ':authority',
  ':scheme',
  ':status',
])

function rowsFromKeyValues(rows?: { key: string, value: string }[]): KeyValueRow[] {
  return (rows ?? [])
    .filter(row => row.key && !PSEUDO_HEADERS.has(row.key.toLowerCase()))
    .map(row => ({
      key: row.key,
      value: row.value,
      enabled: true,
    }))
}

function stringifyBody(body: unknown): string {
  if (body == null || body === '') {
    return ''
  }
  if (typeof body === 'string') {
    return body
  }
  try {
    return JSON.stringify(body, null, 2)
  }
  catch {
    return String(body)
  }
}

export function captureToDraft(record: NetworkDetailRecord, base?: ComposeDraft): ComposeDraft {
  const queryParams = record.query?.length
    ? rowsFromKeyValues(record.query)
    : parseUrlParams(record.url)

  const name = `${record.method} ${record.path || record.url}`.slice(0, 120)

  return {
    ...(base ?? createEmptyDraft()),
    name,
    method: (record.method?.toUpperCase() || 'GET') as ComposeDraft['method'],
    url: record.url,
    queryParams,
    headers: rowsFromKeyValues(record.requestHeaders),
    body: stringifyBody(record.requestBody),
  }
}
