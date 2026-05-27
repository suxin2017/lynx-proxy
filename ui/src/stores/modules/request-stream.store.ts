import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type { WsEventFrame } from '@/lib/generated/ws/v1'
import {
  WsOp,
  type WsEventOp,
} from '@/lib/generated/ws/v1'
import type { NetworkDetailKeyValue, NetworkDetailRecord } from '@/components/ui/network-request-detail'
import type { TrafficRecord } from '@/components/ui/request-tree'
import { deriveRequestCookies, deriveResponseCookies } from '@/lib/http/cookies'
import { parseQueryFromUrl } from '@/lib/http/parse-query'
import {
  displayRequestUrl,
  resolveRequestUrl,
  resolveSnapshotRequestUrl,
} from '@/lib/http/request-url'
import {
  demoteTraceFromOrder,
  isRecordListable,
  mergePartialRequestRecord,
  promoteTraceToOrder,
  type PartialRequestRecord,
} from './request-stream-logic'
import { useGeneralSettingsStore } from './general-settings.store'
import { useWsConnectionStore } from './ws-connection.store'

type CachedRequestSnapshot = {
  traceId?: string
  trace_id?: string
  request?: {
    method?: string
    url?: string
    headers?: Record<string, string>
    version?: string
    body?: unknown
  }
  response?: {
    status?: number
    headers?: Record<string, string>
    body?: unknown
    version?: string
  }
  status?: string | { Error?: string }
}

type SubscribeResponse = {
  subscribed?: boolean
  cachedRequests?: CachedRequestSnapshot[]
}

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const toObject = (value: unknown): Record<string, unknown> | null => {
  if (isObject(value)) {
    return value
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (isObject(parsed)) {
        return parsed
      }
    } catch {
      return null
    }
  }

  return null
}

const toHeaderRows = (headers: unknown): NetworkDetailKeyValue[] => {
  if (!isObject(headers)) {
    return []
  }

  return Object.entries(headers).map(([key, value]) => ({
    key,
    value: String(value ?? ''),
  }))
}

const toHeaderRecord = (headers: unknown): Record<string, string> | undefined => {
  if (!isObject(headers)) {
    return undefined
  }

  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key, String(value ?? '')]),
  )
}

const valueToNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return undefined
}

const inferRequestType = (method: string | undefined, requestType: string | undefined) => {
  if (typeof requestType === 'string' && requestType.trim().length > 0) {
    return requestType
  }

  return method?.toUpperCase() === 'CONNECT' ? 'tunnel' : 'fetch'
}

const normalizeBackendStatus = (
  status: string | { Error?: string } | undefined,
): string | undefined => {
  if (typeof status === 'string') {
    return status.toLowerCase()
  }

  if (status && typeof status === 'object' && 'Error' in status) {
    return 'error'
  }

  return undefined
}

/** Backend `MessageEventStatus::Initial` — request placeholder, not started yet. */
const isUnstartedBackendStatus = (
  status: string | { Error?: string } | undefined,
): boolean => normalizeBackendStatus(status) === 'initial'

/** Only drop backend placeholders that never entered request processing. */
const shouldIncludeSnapshot = (snapshot: {
  status?: string | { Error?: string }
}): boolean => !isUnstartedBackendStatus(snapshot.status)

const eventOps = new Set<WsEventOp>([
  WsOp.RequestStart,
  WsOp.RequestBody,
  WsOp.RequestEnd,
  WsOp.ResponseStart,
  WsOp.ResponseBody,
  WsOp.ResponseEnd,
  WsOp.WebsocketError,
  WsOp.SystemError,
])

export const useRequestStreamStore = defineStore('requestStream', () => {
  const wsConnectionStore = useWsConnectionStore()
  const generalSettingsStore = useGeneralSettingsStore()

  const selectedId = ref<string | undefined>(undefined)
  const traceOrder = ref<string[]>([])
  const recordsByTrace = ref<Record<string, PartialRequestRecord>>({})

  let detachEventListener: (() => void) | null = null

  const trafficRecords = computed<TrafficRecord[]>(() => {
    return traceOrder.value.reduce<TrafficRecord[]>((acc, traceId) => {
      const item = recordsByTrace.value[traceId]
      if (!item || !isRecordListable(item)) {
        return acc
      }

      acc.push({
        id: traceId,
        url: displayRequestUrl(item.url, traceId),
        method: item.method ?? 'GET',
        requestType: inferRequestType(item.method, item.requestType),
        status: item.status ?? 'pending',
        statusCode: item.statusCode,
      })

      return acc
    }, [])
  })

  const selectedRecord = computed<NetworkDetailRecord | null>(() => {
    if (!selectedId.value) {
      return null
    }

    const item = recordsByTrace.value[selectedId.value]
    if (!item || !isRecordListable(item)) {
      return null
    }

    const durationMs =
      item.startAt && item.endAt ? Math.max(0, item.endAt - item.startAt) : undefined

    const resolvedUrl = item.url

    return {
      id: selectedId.value,
      method: item.method ?? 'GET',
      url: displayRequestUrl(resolvedUrl, selectedId.value),
      status: item.status ?? 'pending',
      statusCode: item.statusCode,
      requestType: inferRequestType(item.method, item.requestType),
      protocol: item.protocol,
      remoteAddress: item.remoteAddress,
      durationMs,
      query: parseQueryFromUrl(resolvedUrl),
      requestHeaders: item.requestHeaders,
      responseHeaders: item.responseHeaders,
      requestCookies: item.requestCookies,
      responseCookies: item.responseCookies,
      requestBody: item.requestBody,
      responseBody: item.responseBody,
      requestContentType: item.requestContentType,
      responseContentType: item.responseContentType,
      startTime: item.startAt ? new Date(item.startAt).toISOString() : undefined,
    }
  })

  const trimToMaxLogSize = () => {
    const limit = generalSettingsStore.maxLogSize
    if (traceOrder.value.length <= limit) {
      return
    }

    const droppedIds = traceOrder.value.slice(limit)
    traceOrder.value = traceOrder.value.slice(0, limit)

    if (droppedIds.length === 0) {
      return
    }

    const nextRecords = { ...recordsByTrace.value }
    for (const id of droppedIds) {
      delete nextRecords[id]
    }
    recordsByTrace.value = nextRecords

    if (selectedId.value && droppedIds.includes(selectedId.value)) {
      selectedId.value = undefined
    }
  }

  const demoteFromList = (traceId: string) => {
    traceOrder.value = demoteTraceFromOrder(traceOrder.value, traceId)

    if (selectedId.value === traceId) {
      selectedId.value = undefined
    }
  }

  const promoteToList = (traceId: string) => {
    const record = recordsByTrace.value[traceId]
    if (!isRecordListable(record)) {
      return
    }

    traceOrder.value = promoteTraceToOrder(traceOrder.value, traceId)
    trimToMaxLogSize()
  }

  const updateRecord = (traceId: string, patch: PartialRequestRecord) => {
    const current = recordsByTrace.value[traceId] ?? {}
    recordsByTrace.value = {
      ...recordsByTrace.value,
      [traceId]: mergePartialRequestRecord(current, patch),
    }
  }

  const removeRecord = (traceId: string) => {
    if (!recordsByTrace.value[traceId]) {
      demoteFromList(traceId)
      return
    }

    const nextRecords = { ...recordsByTrace.value }
    delete nextRecords[traceId]
    recordsByTrace.value = nextRecords
    demoteFromList(traceId)
  }

  const pruneIfIncomplete = (traceId: string) => {
    const current = recordsByTrace.value[traceId]
    if (!isRecordListable(current)) {
      removeRecord(traceId)
    }
  }

  watch(
    () => generalSettingsStore.maxLogSize,
    () => {
      trimToMaxLogSize()
    },
  )

  const getTraceId = (frame: WsEventFrame<Record<string, unknown>>): string | null => {
    const payload = toObject(frame.payload)
    const traceId =
      payload?.traceId ??
      payload?.trace_id ??
      payload?.requestId ??
      payload?.id

    if (traceId === undefined || traceId === null) {
      return null
    }

    return String(traceId)
  }

  const applyRequestStart = (
    traceId: string,
    payload: Record<string, unknown> | null,
    frame: WsEventFrame<Record<string, unknown>>,
  ) => {
    const requestHeaders = toHeaderRecord(payload?.headers)
    const method = typeof payload?.method === 'string' ? payload.method : 'GET'
    const url = resolveRequestUrl({
      url: payload?.url,
      uri: payload?.uri,
      method,
      headers: requestHeaders,
    })

    updateRecord(traceId, {
      method,
      ...(url ? { url } : {}),
      status: 'pending',
      requestHeaders: toHeaderRows(payload?.headers),
      requestCookies: deriveRequestCookies(requestHeaders),
      requestContentType:
        typeof payload?.contentType === 'string' ? payload.contentType : undefined,
      requestType: inferRequestType(
        typeof payload?.method === 'string' ? payload.method : 'GET',
        typeof payload?.requestType === 'string' ? payload.requestType : undefined,
      ),
      protocol: typeof payload?.version === 'string' ? payload.version : undefined,
      startAt: frame.timestamp,
    })

    promoteToList(traceId)
  }

  const applyRequestBody = (traceId: string, payload: Record<string, unknown> | null) => {
    updateRecord(traceId, {
      requestBody: payload?.body ?? payload?.data,
    })
  }

  const applyRequestEnd = (traceId: string, frame: WsEventFrame<Record<string, unknown>>) => {
    updateRecord(traceId, {
      endAt: frame.timestamp,
    })
    pruneIfIncomplete(traceId)
  }

  const applyResponseStart = (traceId: string, payload: Record<string, unknown> | null) => {
    const statusCode = valueToNumber(payload?.status)
    const status: TrafficRecord['status'] =
      statusCode === undefined ? 'pending' : statusCode >= 400 ? 'error' : 'success'

    const responseHeaders = toHeaderRecord(payload?.headers)

    updateRecord(traceId, {
      statusCode,
      status,
      responseHeaders: toHeaderRows(payload?.headers),
      responseCookies: deriveResponseCookies(responseHeaders),
      responseContentType:
        typeof payload?.contentType === 'string' ? payload.contentType : undefined,
      remoteAddress:
        typeof payload?.remoteAddress === 'string' ? payload.remoteAddress : undefined,
    })
  }

  const applyResponseBody = (traceId: string, payload: Record<string, unknown> | null) => {
    updateRecord(traceId, {
      responseBody: payload?.body ?? payload?.data,
    })
  }

  const applyResponseEnd = (traceId: string, frame: WsEventFrame<Record<string, unknown>>) => {
    const current = recordsByTrace.value[traceId]
    const statusCode = current?.statusCode

    updateRecord(traceId, {
      status:
        statusCode === undefined ? current?.status ?? 'success' : statusCode >= 400 ? 'error' : 'success',
      endAt: frame.timestamp,
    })
    pruneIfIncomplete(traceId)
  }

  const applyError = (traceId: string) => {
    updateRecord(traceId, {
      status: 'error',
    })
  }

  const applyCachedSnapshot = (snapshot: CachedRequestSnapshot) => {
    const traceId = snapshot.traceId ?? snapshot.trace_id
    if (!traceId) {
      return
    }

    if (!shouldIncludeSnapshot(snapshot)) {
      return
    }

    const url = resolveSnapshotRequestUrl(snapshot)
    if (!url) {
      return
    }

    const statusCode = valueToNumber(snapshot.response?.status)
    const nextStatus: TrafficRecord['status'] =
      typeof snapshot.status === 'string' && snapshot.status.toLowerCase().includes('error')
        ? 'error'
        : statusCode !== undefined
          ? statusCode >= 400
            ? 'error'
            : 'success'
          : 'pending'

    updateRecord(traceId, {
      method: snapshot.request?.method,
      url,
      statusCode,
      status: nextStatus,
      requestHeaders: toHeaderRows(snapshot.request?.headers),
      responseHeaders: toHeaderRows(snapshot.response?.headers),
      requestCookies: deriveRequestCookies(snapshot.request?.headers),
      responseCookies: deriveResponseCookies(snapshot.response?.headers),
      requestBody: snapshot.request?.body,
      responseBody: snapshot.response?.body,
      protocol: snapshot.request?.version ?? snapshot.response?.version,
    })

    promoteToList(traceId)
  }

  const handleEventFrame = (frame: WsEventFrame<Record<string, unknown>>) => {
    if (!eventOps.has(frame.op as WsEventOp)) {
      return
    }

    const traceId = getTraceId(frame)
    if (!traceId) {
      return
    }

    const payload = toObject(frame.payload)

    switch (frame.op) {
      case WsOp.RequestStart:
        applyRequestStart(traceId, payload, frame)
        break
      case WsOp.RequestBody:
        applyRequestBody(traceId, payload)
        break
      case WsOp.RequestEnd:
        applyRequestEnd(traceId, frame)
        break
      case WsOp.ResponseStart:
        applyResponseStart(traceId, payload)
        break
      case WsOp.ResponseBody:
        applyResponseBody(traceId, payload)
        break
      case WsOp.ResponseEnd:
        applyResponseEnd(traceId, frame)
        break
      case WsOp.WebsocketError:
      case WsOp.SystemError:
        applyError(traceId)
        break
      default:
        break
    }
  }

  const start = async () => {
    await wsConnectionStore.connect()
    await generalSettingsStore.load()
    if (!detachEventListener) {
      detachEventListener = wsConnectionStore.onEvent(handleEventFrame)
    }
  }

  const stop = async () => {
    detachEventListener?.()
    detachEventListener = null

    try {
      await wsConnectionStore.call(WsOp.RequestStreamUnsubscribe)
    } catch {
      // Ignore unsubscribe errors during teardown.
    }
  }

  const subscribe = async () => {
    const response = await wsConnectionStore.call<SubscribeResponse>(
      WsOp.RequestStreamSubscribe,
    )

    response?.cachedRequests?.forEach((item) => {
      applyCachedSnapshot(item)
    })

    trimToMaxLogSize()
  }

  const unsubscribe = async () => {
    await wsConnectionStore.call(WsOp.RequestStreamUnsubscribe)
  }

  const select = (traceId?: string) => {
    selectedId.value = traceId
  }

  const clear = () => {
    traceOrder.value = []
    recordsByTrace.value = {}
    selectedId.value = undefined
  }

  return {
    selectedId,
    trafficRecords,
    selectedRecord,
    start,
    stop,
    subscribe,
    unsubscribe,
    select,
    clear,
  }
})
