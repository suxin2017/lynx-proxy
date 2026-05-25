import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { WsEventFrame } from '@/lib/generated/ws/v1'
import {
  WsOp,
  type WsEventOp,
} from '@/lib/generated/ws/v1'
import type { NetworkDetailKeyValue, NetworkDetailRecord } from '@/components/ui/network-request-detail'
import type { TrafficRecord } from '@/components/ui/request-tree'
import { useWsConnectionStore } from './ws-connection.store'

type PartialRequestRecord = {
  method?: string
  url?: string
  status?: TrafficRecord['status']
  statusCode?: number
  requestType?: string
  requestHeaders?: NetworkDetailKeyValue[]
  responseHeaders?: NetworkDetailKeyValue[]
  requestBody?: unknown
  responseBody?: unknown
  requestContentType?: string
  responseContentType?: string
  startAt?: number
  endAt?: number
  remoteAddress?: string
  protocol?: string
}

type CachedRequestSnapshot = {
  traceId?: string
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

type RequestDetailPayload = {
  traceId?: string
  status?: string | { Error?: string }
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
    version?: string
    body?: unknown
  }
  timings?: {
    requestStart?: number
    requestEnd?: number
    proxyStart?: number
    proxyEnd?: number
  }
}

type RequestDetailResponse = {
  traceId?: string
  detail?: RequestDetailPayload | null
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

const readHeaderValue = (headers: Record<string, string> | undefined, key: string) => {
  if (!headers) {
    return undefined
  }

  const lowerKey = key.toLowerCase()
  const match = Object.entries(headers).find(([name]) => name.toLowerCase() === lowerKey)
  return match?.[1]
}

const inferRequestType = (method: string | undefined, requestType: string | undefined) => {
  if (typeof requestType === 'string' && requestType.trim().length > 0) {
    return requestType
  }

  return method?.toUpperCase() === 'CONNECT' ? 'tunnel' : 'fetch'
}

const toTrafficStatus = (
  status: string | { Error?: string } | undefined,
  statusCode: number | undefined,
): TrafficRecord['status'] => {
  if (typeof status === 'string') {
    const normalized = status.toLowerCase()
    if (normalized.includes('cancel')) {
      return 'cancelled'
    }

    if (normalized.includes('error')) {
      return 'error'
    }

    if (normalized.includes('complete')) {
      return statusCode !== undefined && statusCode >= 400 ? 'error' : 'success'
    }
  }

  if (status && typeof status === 'object' && 'Error' in status) {
    return 'error'
  }

  if (statusCode !== undefined) {
    return statusCode >= 400 ? 'error' : 'success'
  }

  return 'pending'
}

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

  const selectedId = ref<string | undefined>(undefined)
  const traceOrder = ref<string[]>([])
  const recordsByTrace = ref<Record<string, PartialRequestRecord>>({})
  let detailRequestToken = 0

  let detachEventListener: (() => void) | null = null

  const trafficRecords = computed<TrafficRecord[]>(() => {
    return traceOrder.value.reduce<TrafficRecord[]>((acc, traceId) => {
      const item = recordsByTrace.value[traceId]
      if (!item) {
        return acc
      }

      acc.push({
        id: traceId,
        url: item.url ?? `trace://${traceId}`,
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
    if (!item) {
      return null
    }

    const durationMs =
      item.startAt && item.endAt ? Math.max(0, item.endAt - item.startAt) : undefined

    return {
      id: selectedId.value,
      method: item.method ?? 'GET',
      url: item.url ?? `trace://${selectedId.value}`,
      status: item.status ?? 'pending',
      statusCode: item.statusCode,
      requestType: inferRequestType(item.method, item.requestType),
      protocol: item.protocol,
      remoteAddress: item.remoteAddress,
      durationMs,
      requestHeaders: item.requestHeaders,
      responseHeaders: item.responseHeaders,
      requestBody: item.requestBody,
      responseBody: item.responseBody,
      requestContentType: item.requestContentType,
      responseContentType: item.responseContentType,
      startTime: item.startAt ? new Date(item.startAt).toISOString() : undefined,
    }
  })

  const patchRecord = (traceId: string, patch: PartialRequestRecord) => {
    const current = recordsByTrace.value[traceId] ?? {}
    recordsByTrace.value[traceId] = {
      ...current,
      ...patch,
    }

    if (!traceOrder.value.includes(traceId)) {
      traceOrder.value.unshift(traceId)
    }
  }

  const getTraceId = (frame: WsEventFrame<Record<string, unknown>>): string => {
    const payload = toObject(frame.payload)
    const traceId =
      payload?.traceId ??
      payload?.trace_id ??
      payload?.requestId ??
      payload?.id ??
      frame.id

    return String(traceId)
  }

  const applyRequestStart = (
    traceId: string,
    payload: Record<string, unknown> | null,
    frame: WsEventFrame<Record<string, unknown>>,
  ) => {
    patchRecord(traceId, {
      method: typeof payload?.method === 'string' ? payload.method : 'GET',
      url: typeof payload?.url === 'string' ? payload.url : `trace://${traceId}`,
      status: 'pending',
      requestHeaders: toHeaderRows(payload?.headers),
      requestContentType:
        typeof payload?.contentType === 'string' ? payload.contentType : undefined,
      requestType: inferRequestType(
        typeof payload?.method === 'string' ? payload.method : 'GET',
        typeof payload?.requestType === 'string' ? payload.requestType : undefined,
      ),
      protocol: typeof payload?.version === 'string' ? payload.version : undefined,
      startAt: frame.timestamp,
    })
  }

  const applyRequestBody = (traceId: string, payload: Record<string, unknown> | null) => {
    patchRecord(traceId, {
      requestBody: payload?.body ?? payload?.data,
    })
  }

  const applyRequestEnd = (traceId: string, frame: WsEventFrame<Record<string, unknown>>) => {
    patchRecord(traceId, {
      endAt: frame.timestamp,
    })
  }

  const applyResponseStart = (traceId: string, payload: Record<string, unknown> | null) => {
    const statusCode = valueToNumber(payload?.status)
    const status: TrafficRecord['status'] =
      statusCode === undefined ? 'pending' : statusCode >= 400 ? 'error' : 'success'

    patchRecord(traceId, {
      statusCode,
      status,
      responseHeaders: toHeaderRows(payload?.headers),
      responseContentType:
        typeof payload?.contentType === 'string' ? payload.contentType : undefined,
      remoteAddress:
        typeof payload?.remoteAddress === 'string' ? payload.remoteAddress : undefined,
    })
  }

  const applyResponseBody = (traceId: string, payload: Record<string, unknown> | null) => {
    patchRecord(traceId, {
      responseBody: payload?.body ?? payload?.data,
    })
  }

  const applyResponseEnd = (traceId: string, frame: WsEventFrame<Record<string, unknown>>) => {
    const current = recordsByTrace.value[traceId]
    const statusCode = current?.statusCode

    patchRecord(traceId, {
      status:
        statusCode === undefined ? current?.status ?? 'success' : statusCode >= 400 ? 'error' : 'success',
      endAt: frame.timestamp,
    })
  }

  const applyError = (traceId: string) => {
    patchRecord(traceId, {
      status: 'error',
    })
  }

  const applyCachedSnapshot = (snapshot: CachedRequestSnapshot) => {
    const traceId = snapshot.traceId
    if (!traceId) {
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

    patchRecord(traceId, {
      method: snapshot.request?.method,
      url: snapshot.request?.url,
      statusCode,
      status: nextStatus,
      requestHeaders: toHeaderRows(snapshot.request?.headers),
      responseHeaders: toHeaderRows(snapshot.response?.headers),
      requestBody: snapshot.request?.body,
      responseBody: snapshot.response?.body,
      protocol: snapshot.request?.version ?? snapshot.response?.version,
    })
  }

  const applyDetailSnapshot = (snapshot: RequestDetailPayload) => {
    const traceId = snapshot.traceId
    if (!traceId) {
      return
    }

    const statusCode = valueToNumber(snapshot.response?.status)
    const startAt = valueToNumber(snapshot.timings?.requestStart)
    const endAt = valueToNumber(snapshot.timings?.proxyEnd)
    const requestHeaders = snapshot.request?.headers
    const responseHeaders = snapshot.response?.headers

    patchRecord(traceId, {
      method: snapshot.request?.method,
      url: snapshot.request?.url,
      statusCode,
      status: toTrafficStatus(snapshot.status, statusCode),
      requestHeaders: toHeaderRows(requestHeaders),
      responseHeaders: toHeaderRows(responseHeaders),
      requestBody: snapshot.request?.body,
      responseBody: snapshot.response?.body,
      requestContentType: readHeaderValue(requestHeaders, 'content-type'),
      responseContentType: readHeaderValue(responseHeaders, 'content-type'),
      protocol: snapshot.request?.version ?? snapshot.response?.version,
      startAt,
      endAt,
    })
  }

  const fetchRequestDetail = async (traceId: string) => {
    const token = ++detailRequestToken

    try {
      const response = await wsConnectionStore.call<RequestDetailResponse>(
        WsOp.RequestDetailGet,
        { traceId },
      )

      if (token !== detailRequestToken || selectedId.value !== traceId) {
        return
      }

      if (!response?.detail) {
        return
      }

      applyDetailSnapshot(response.detail)
    } catch {
      // Keep stream rendering resilient when detail fetch fails.
    }
  }

  const handleEventFrame = (frame: WsEventFrame<Record<string, unknown>>) => {
    if (!eventOps.has(frame.op as WsEventOp)) {
      return
    }

    const traceId = getTraceId(frame)
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
  }

  const unsubscribe = async () => {
    await wsConnectionStore.call(WsOp.RequestStreamUnsubscribe)
  }

  const select = (traceId?: string) => {
    selectedId.value = traceId

    if (traceId) {
      void fetchRequestDetail(traceId)
    }
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
