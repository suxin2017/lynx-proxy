import {
  WS_PROTOCOL_VERSION,
  WsFrameKind,
  WsOp,
  type WsClientFrame,
  type WsEventFrame,
  type WsRequestFrame,
  type WsResponseFrame,
  type WsServerFrame,
  isWsErrorFrame,
  isWsEventFrame,
  isWsResponseFrame,
} from '@/lib/generated/ws/v1'

export const WsConnectionState = {
  Disconnected: 'disconnected',
  Connecting: 'connecting',
  Connected: 'connected',
  Error: 'error',
} as const

export type WsConnectionState =
  (typeof WsConnectionState)[keyof typeof WsConnectionState]

export interface WsClientOptions {
  url: string
  requestTimeoutMs?: number
  reconnectMaxAttempts?: number
  reconnectBaseDelayMs?: number
  reconnectMaxDelayMs?: number
  heartbeatMs?: number
}

type PendingRequest = {
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
  timeoutId: number
}

type EventHandler = (frame: WsEventFrame<Record<string, unknown>>) => void

type ConnectionStateHandler = (state: WsConnectionState, reason?: string) => void

const defaultOptions = {
  requestTimeoutMs: 10_000,
  reconnectMaxAttempts: 8,
  reconnectBaseDelayMs: 400,
  reconnectMaxDelayMs: 8_000,
  heartbeatMs: 15_000,
}

const nextId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export class WsClient {
  private ws: WebSocket | null = null
  private connectPromise: Promise<void> | null = null
  private options: Required<WsClientOptions>
  private state: WsConnectionState = WsConnectionState.Disconnected
  private reconnectAttempt = 0
  private reconnectTimer: number | null = null
  private heartbeatTimer: number | null = null
  private pendingRequests = new Map<string, PendingRequest>()
  private eventHandlers = new Set<EventHandler>()
  private stateHandlers = new Set<ConnectionStateHandler>()

  constructor(options: WsClientOptions) {
    this.options = {
      ...defaultOptions,
      ...options,
    }
  }

  getState(): WsConnectionState {
    return this.state
  }

  connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve()
    }

    if (this.connectPromise) {
      return this.connectPromise
    }

    this.updateState(WsConnectionState.Connecting)

    this.connectPromise = new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.options.url)

        this.ws.onopen = () => {
          this.connectPromise = null
          this.reconnectAttempt = 0
          this.updateState(WsConnectionState.Connected)
          this.startHeartbeat()
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleIncomingFrame(event.data)
        }

        this.ws.onerror = () => {
          this.connectPromise = null
          this.updateState(WsConnectionState.Error, 'WebSocket connection error')
          reject(new Error('WebSocket connection error'))
        }

        this.ws.onclose = (event) => {
          this.connectPromise = null
          this.stopHeartbeat()
          this.ws = null
          this.rejectAllPending(new Error('WebSocket disconnected'))

          const shouldReconnect = event.code !== 1000
          if (shouldReconnect) {
            this.scheduleReconnect()
          } else {
            this.updateState(WsConnectionState.Disconnected)
          }
        }
      } catch (error) {
        this.connectPromise = null
        this.updateState(WsConnectionState.Error, String(error))
        reject(error)
      }
    })

    return this.connectPromise
  }

  disconnect(code = 1000, reason = 'Client disconnect') {
    this.connectPromise = null

    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    this.stopHeartbeat()

    if (this.ws) {
      this.ws.close(code, reason)
      this.ws = null
    }

    this.rejectAllPending(new Error('WebSocket disconnected by client'))
    this.updateState(WsConnectionState.Disconnected)
  }

  onEvent(handler: EventHandler): () => void {
    this.eventHandlers.add(handler)
    return () => this.eventHandlers.delete(handler)
  }

  onStateChange(handler: ConnectionStateHandler): () => void {
    this.stateHandlers.add(handler)
    handler(this.state)
    return () => this.stateHandlers.delete(handler)
  }

  async call<TResponse = unknown, TPayload = Record<string, unknown>>(
    op: string,
    payload?: TPayload,
    timeoutMs = this.options.requestTimeoutMs,
  ): Promise<TResponse> {
    await this.connect()

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected')
    }

    const frameId = nextId()
    const frame: WsRequestFrame<TPayload> = {
      version: WS_PROTOCOL_VERSION,
      kind: WsFrameKind.Request,
      id: frameId,
      op,
      timestamp: Date.now(),
      payload,
    }

    return new Promise<TResponse>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        this.pendingRequests.delete(frameId)
        reject(new Error(`Request timeout for op: ${op}`))
      }, timeoutMs)

      this.pendingRequests.set(frameId, {
        resolve: (value) => resolve(value as TResponse),
        reject,
        timeoutId,
      })

      this.send(frame)
    })
  }

  send<TPayload = Record<string, unknown>>(frame: WsClientFrame<TPayload>) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected')
    }

    this.ws.send(JSON.stringify(frame))
  }

  private handleIncomingFrame(raw: string) {
    let frame: WsServerFrame<Record<string, unknown>>

    try {
      frame = JSON.parse(raw) as WsServerFrame<Record<string, unknown>>
    } catch {
      this.updateState(WsConnectionState.Error, 'Invalid server frame')
      return
    }

    if (isWsResponseFrame(frame)) {
      this.resolvePending(frame)
      return
    }

    if (isWsErrorFrame(frame)) {
      const pending = this.pendingRequests.get(frame.id)
      if (pending) {
        window.clearTimeout(pending.timeoutId)
        this.pendingRequests.delete(frame.id)
        pending.reject(new Error(`${frame.error.code}: ${frame.error.message}`))
      }
      return
    }

    if (isWsEventFrame(frame)) {
      this.eventHandlers.forEach((handler) => handler(frame))
      return
    }

    if (frame.kind === WsFrameKind.Pong) {
      return
    }
  }

  private resolvePending(frame: WsResponseFrame<Record<string, unknown>>) {
    const pending = this.pendingRequests.get(frame.id)
    if (!pending) {
      return
    }

    window.clearTimeout(pending.timeoutId)
    this.pendingRequests.delete(frame.id)
    pending.resolve(frame.payload)
  }

  private rejectAllPending(error: Error) {
    this.pendingRequests.forEach((pending) => {
      window.clearTimeout(pending.timeoutId)
      pending.reject(error)
    })
    this.pendingRequests.clear()
  }

  private scheduleReconnect() {
    if (this.reconnectAttempt >= this.options.reconnectMaxAttempts) {
      this.updateState(WsConnectionState.Error, 'Reconnect attempts exhausted')
      return
    }

    this.reconnectAttempt += 1
    const delay = Math.min(
      this.options.reconnectBaseDelayMs * 2 ** (this.reconnectAttempt - 1),
      this.options.reconnectMaxDelayMs,
    )

    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer)
    }

    this.reconnectTimer = window.setTimeout(() => {
      this.connect().catch(() => {
        // Reconnect loop is controlled by onclose/scheduleReconnect.
      })
    }, delay)
  }

  private startHeartbeat() {
    this.stopHeartbeat()

    this.heartbeatTimer = window.setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return
      }

      this.send({
        version: WS_PROTOCOL_VERSION,
        kind: WsFrameKind.Ping,
        id: nextId(),
        op: WsOp.SystemPing,
        timestamp: Date.now(),
      })
    }, this.options.heartbeatMs)
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private updateState(state: WsConnectionState, reason?: string) {
    this.state = state
    this.stateHandlers.forEach((handler) => handler(state, reason))
  }
}

export const createDefaultWsClient = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'

  return new WsClient({
    url: `${protocol}://${window.location.host}/api/net_request/ws/message-events`,
  })
}
