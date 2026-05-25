import { WsOp, type WsEventFrame } from '@/lib/generated/ws/v1'
import type { WsClient } from '@/lib/ws/client'

export interface CaptureStatusResponse {
  recordingStatus: string
}

export interface CaptureControlPayload {
  recording: boolean
}

export interface RequestDetailPayload {
  traceId: string
}

export interface RequestDetailValue {
  traceId: string
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
  timings?: Record<string, number | undefined>
}

export interface RequestDetailResponse {
  traceId: string
  detail?: RequestDetailValue | null
}

export interface WsApi {
  getCaptureStatus: () => Promise<CaptureStatusResponse>
  setCaptureControl: (payload: CaptureControlPayload) => Promise<unknown>
  getRequestDetail: (payload: RequestDetailPayload) => Promise<RequestDetailResponse>
  subscribeRequestStream: () => Promise<unknown>
  unsubscribeRequestStream: () => Promise<unknown>
  onEvent: (handler: (frame: WsEventFrame<Record<string, unknown>>) => void) => () => void
}

export const createWsApi = (client: WsClient): WsApi => {
  return {
    getCaptureStatus: () => client.call<CaptureStatusResponse>(WsOp.CaptureStatusGet),
    setCaptureControl: (payload) => client.call(WsOp.CaptureControlSet, payload),
    getRequestDetail: (payload) =>
      client.call<RequestDetailResponse, RequestDetailPayload>(
        WsOp.RequestDetailGet,
        payload,
      ),
    subscribeRequestStream: () => client.call(WsOp.RequestStreamSubscribe),
    unsubscribeRequestStream: () => client.call(WsOp.RequestStreamUnsubscribe),
    onEvent: (handler) => client.onEvent(handler),
  }
}
