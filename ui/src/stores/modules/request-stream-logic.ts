import type { NetworkDetailKeyValue } from '@/components/ui/network-request-detail'
import type { TrafficRecord } from '@/components/ui/request-tree'

export type PartialRequestRecord = {
  method?: string
  url?: string
  status?: TrafficRecord['status']
  statusCode?: number
  requestType?: string
  requestHeaders?: NetworkDetailKeyValue[]
  responseHeaders?: NetworkDetailKeyValue[]
  requestCookies?: NetworkDetailKeyValue[]
  responseCookies?: NetworkDetailKeyValue[]
  requestBody?: unknown
  responseBody?: unknown
  requestBodyBytes?: Uint8Array
  responseBodyBytes?: Uint8Array
  requestBodyTruncated?: boolean
  responseBodyTruncated?: boolean
  requestContentType?: string
  responseContentType?: string
  startAt?: number
  endAt?: number
  remoteAddress?: string
  protocol?: string
}

export function isRecordListable(record: PartialRequestRecord | undefined): boolean {
  return Boolean(record?.url && record.url.length > 0)
}

const TRAFFIC_LIST_PATCH_KEYS = [
  'method',
  'url',
  'status',
  'statusCode',
  'requestType',
  'requestHeaders',
] as const satisfies ReadonlyArray<keyof PartialRequestRecord>

/** Body/header detail updates for the selected row still skip list/filter churn when absent from patch. */
export function patchTouchesTrafficList(patch: PartialRequestRecord): boolean {
  return TRAFFIC_LIST_PATCH_KEYS.some(key => patch[key] !== undefined)
}

export function mergePartialRequestRecord(
  current: PartialRequestRecord,
  patch: PartialRequestRecord,
): PartialRequestRecord {
  const next: PartialRequestRecord = {
    ...current,
    ...patch,
  }

  if (patch.method === undefined) {
    next.method = current.method
  }
  if (patch.url === undefined) {
    next.url = current.url
  }
  if (patch.status === undefined) {
    next.status = current.status
  }
  if (patch.statusCode === undefined) {
    next.statusCode = current.statusCode
  }
  if (patch.requestType === undefined) {
    next.requestType = current.requestType
  }
  if (patch.requestHeaders === undefined) {
    next.requestHeaders = current.requestHeaders
  }
  if (patch.responseHeaders === undefined) {
    next.responseHeaders = current.responseHeaders
  }
  if (patch.requestCookies === undefined) {
    next.requestCookies = current.requestCookies
  }
  if (patch.responseCookies === undefined) {
    next.responseCookies = current.responseCookies
  }
  if (patch.requestBody === undefined) {
    next.requestBody = current.requestBody
  }
  if (patch.responseBody === undefined) {
    next.responseBody = current.responseBody
  }
  if (patch.requestBodyBytes === undefined) {
    next.requestBodyBytes = current.requestBodyBytes
  }
  if (patch.responseBodyBytes === undefined) {
    next.responseBodyBytes = current.responseBodyBytes
  }
  if (patch.requestBodyTruncated === undefined) {
    next.requestBodyTruncated = current.requestBodyTruncated
  }
  if (patch.responseBodyTruncated === undefined) {
    next.responseBodyTruncated = current.responseBodyTruncated
  }
  if (patch.requestContentType === undefined) {
    next.requestContentType = current.requestContentType
  }
  if (patch.responseContentType === undefined) {
    next.responseContentType = current.responseContentType
  }
  if (patch.startAt === undefined) {
    next.startAt = current.startAt
  }
  if (patch.endAt === undefined) {
    next.endAt = current.endAt
  }
  if (patch.remoteAddress === undefined) {
    next.remoteAddress = current.remoteAddress
  }
  if (patch.protocol === undefined) {
    next.protocol = current.protocol
  }

  return next
}

export function promoteTraceToOrder(traceOrder: string[], traceId: string): string[] {
  if (traceOrder.includes(traceId)) {
    return traceOrder
  }

  return [...traceOrder, traceId]
}

export function demoteTraceFromOrder(traceOrder: string[], traceId: string): string[] {
  return traceOrder.filter(id => id !== traceId)
}
