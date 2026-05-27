/* eslint-disable */
// Generated from crates/lynx-core/protocol/ws.v1.asyncapi.yaml. Do not edit manually.

export const WS_PROTOCOL_VERSION = 'v1' as const

export type WsProtocolVersion = typeof WS_PROTOCOL_VERSION

export const WsFrameKind = {
  Request: 'request',
  Response: 'response',
  Event: 'event',
  Error: 'error',
  Ping: 'ping',
  Pong: 'pong',
} as const

export type WsFrameKind = (typeof WsFrameKind)[keyof typeof WsFrameKind]

export const WsOp = {
  SystemPing: 'system.ping',
  CaptureStatusGet: 'capture.status.get',
  CaptureControlSet: 'capture.control.set',
  RequestDetailGet: 'request.detail.get',
  RequestStreamSubscribe: 'request.stream.subscribe',
  RequestStreamUnsubscribe: 'request.stream.unsubscribe',
  SettingsGeneralGet: 'settings.general.get',
  SettingsGeneralSet: 'settings.general.set',
  SettingsCaptureFilterGet: 'settings.captureFilter.get',
  SettingsCaptureFilterSet: 'settings.captureFilter.set',
  SettingsCertificatePathGet: 'settings.certificate.path.get',
  CaptureStatusChanged: 'capture.status.changed',
  RequestStart: 'request.start',
  RequestBody: 'request.body',
  RequestEnd: 'request.end',
  ResponseStart: 'response.start',
  ResponseBody: 'response.body',
  ResponseEnd: 'response.end',
  WebsocketMessage: 'websocket.message',
  WebsocketError: 'websocket.error',
  SystemError: 'system.error',
} as const

export type WsRequestOp =
  | 'system.ping'
  | 'capture.status.get'
  | 'capture.control.set'
  | 'request.detail.get'
  | 'request.stream.subscribe'
  | 'request.stream.unsubscribe'
  | 'settings.general.get'
  | 'settings.general.set'
  | 'settings.captureFilter.get'
  | 'settings.captureFilter.set'
  | 'settings.certificate.path.get'

export type WsEventOp =
  | 'capture.status.changed'
  | 'request.start'
  | 'request.body'
  | 'request.end'
  | 'response.start'
  | 'response.body'
  | 'response.end'
  | 'websocket.message'
  | 'websocket.error'
  | 'system.error'

export interface WsErrorPayload {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface WsBaseFrame {
  version: WsProtocolVersion
  kind: WsFrameKind
  id: string
  op: string
  timestamp: number
}

export interface WsRequestFrame<TPayload = Record<string, unknown>>
  extends WsBaseFrame {
  kind: typeof WsFrameKind.Request
  payload?: TPayload
}

export interface WsResponseFrame<TPayload = Record<string, unknown>>
  extends WsBaseFrame {
  kind: typeof WsFrameKind.Response
  payload?: TPayload
}

export interface WsEventFrame<TPayload = Record<string, unknown>> extends WsBaseFrame {
  kind: typeof WsFrameKind.Event
  payload?: TPayload
}

export interface WsErrorFrame extends WsBaseFrame {
  kind: typeof WsFrameKind.Error
  error: WsErrorPayload
}

export interface WsPingFrame extends WsBaseFrame {
  kind: typeof WsFrameKind.Ping
}

export interface WsPongFrame extends WsBaseFrame {
  kind: typeof WsFrameKind.Pong
}

export type WsClientFrame<TPayload = Record<string, unknown>> =
  | WsRequestFrame<TPayload>
  | WsPingFrame

export type WsServerFrame<TPayload = Record<string, unknown>> =
  | WsResponseFrame<TPayload>
  | WsEventFrame<TPayload>
  | WsErrorFrame
  | WsPongFrame

export interface WsRequestOptions {
  timeoutMs?: number
}

export const isWsResponseFrame = (
  frame: WsServerFrame,
): frame is WsResponseFrame<Record<string, unknown>> => {
  return frame.kind === WsFrameKind.Response
}

export const isWsEventFrame = (
  frame: WsServerFrame,
): frame is WsEventFrame<Record<string, unknown>> => {
  return frame.kind === WsFrameKind.Event
}

export const isWsErrorFrame = (frame: WsServerFrame): frame is WsErrorFrame => {
  return frame.kind === WsFrameKind.Error
}

export const isWsEventOp = (op: string): op is WsEventOp => {
  return op in WsOp
}
