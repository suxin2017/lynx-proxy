import type { NetworkWebSocketFrame, WebSocketFrameDirection, WebSocketFrameOpcode } from '@/components/ui/network-request-detail/types'
import { formatBase64Body, formatHexDump, formatTextBody } from '@/lib/http/body-formatters'
import { base64ToBytes } from '@/lib/http/body-transport'

export const MAX_WEBSOCKET_FRAMES = 1_000

const PREVIEW_MAX_CHARS = 120

let frameIdCounter = 0

export function nextWebSocketFrameId(): string {
  frameIdCounter += 1
  return `ws-frame-${frameIdCounter}`
}

export function decodeMessageBody(value: unknown): Uint8Array {
  if (value == null) {
    return new Uint8Array()
  }

  if (typeof value === 'string') {
    try {
      return base64ToBytes(value)
    }
    catch {
      return new TextEncoder().encode(value)
    }
  }

  return new Uint8Array()
}

function normalizeDirection(value: unknown): WebSocketFrameDirection | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  if (normalized === 'ClientToServer' || normalized === 'clientToServer') {
    return 'clientToServer'
  }
  if (normalized === 'ServerToClient' || normalized === 'serverToClient') {
    return 'serverToClient'
  }

  return null
}

type ParsedOpcode = {
  opcode: WebSocketFrameOpcode
  bytes: Uint8Array
  closeCode?: number
}

function parseMessageVariant(message: unknown): ParsedOpcode | null {
  if (!message || typeof message !== 'object') {
    return null
  }

  const record = message as Record<string, unknown>

  if ('text' in record) {
    return { opcode: 'text', bytes: decodeMessageBody(record.text) }
  }
  if ('binary' in record) {
    return { opcode: 'binary', bytes: decodeMessageBody(record.binary) }
  }
  if ('ping' in record) {
    return { opcode: 'ping', bytes: decodeMessageBody(record.ping) }
  }
  if ('pong' in record) {
    return { opcode: 'pong', bytes: decodeMessageBody(record.pong) }
  }
  if ('close' in record) {
    const closeValue = record.close
    if (closeValue == null) {
      return { opcode: 'close', bytes: new Uint8Array() }
    }

    if (Array.isArray(closeValue)) {
      const [code, reason] = closeValue
      return {
        opcode: 'close',
        bytes: decodeMessageBody(reason),
        closeCode: typeof code === 'number' ? code : undefined,
      }
    }

    return { opcode: 'close', bytes: new Uint8Array() }
  }

  // Legacy PascalCase keys from older payloads
  if ('Text' in record) {
    return { opcode: 'text', bytes: decodeMessageBody(record.Text) }
  }
  if ('Binary' in record) {
    return { opcode: 'binary', bytes: decodeMessageBody(record.Binary) }
  }
  if ('Ping' in record) {
    return { opcode: 'ping', bytes: decodeMessageBody(record.Ping) }
  }
  if ('Pong' in record) {
    return { opcode: 'pong', bytes: decodeMessageBody(record.Pong) }
  }
  if ('Close' in record) {
    const closeValue = record.Close
    if (closeValue == null) {
      return { opcode: 'close', bytes: new Uint8Array() }
    }
    if (Array.isArray(closeValue)) {
      const [code, reason] = closeValue
      return {
        opcode: 'close',
        bytes: decodeMessageBody(reason),
        closeCode: typeof code === 'number' ? code : undefined,
      }
    }
    return { opcode: 'close', bytes: new Uint8Array() }
  }

  return null
}

export function buildPreviewLabel(
  opcode: WebSocketFrameOpcode,
  bytes: Uint8Array,
  closeCode?: number,
): string {
  if (opcode === 'close') {
    return closeCode != null ? `close (${closeCode})` : 'close'
  }

  if (opcode === 'ping') {
    return 'ping'
  }

  if (opcode === 'pong') {
    return 'pong'
  }

  if (opcode === 'binary') {
    return bytes.length > 0 ? `binary (${bytes.length} B)` : 'binary'
  }

  if (bytes.length === 0) {
    return 'text'
  }

  const text = formatTextBody(bytes)
  const singleLine = text.replace(/\s+/g, ' ').trim()
  if (singleLine.length <= PREVIEW_MAX_CHARS) {
    return singleLine
  }

  return `${singleLine.slice(0, PREVIEW_MAX_CHARS)}…`
}

export function formatFrameDataPreview(
  bytes: Uint8Array,
  kind: 'text' | 'hex' | 'base64',
): string {
  if (bytes.length === 0) {
    return ''
  }

  switch (kind) {
    case 'hex':
      return formatHexDump(bytes)
    case 'base64':
      return formatBase64Body(bytes)
    default:
      return formatTextBody(bytes)
  }
}

export function truncateWebSocketFramePreview(text: string, max = PREVIEW_MAX_CHARS): string {
  if (text.length <= max) {
    return text
  }

  return `${text.slice(0, max)}…`
}

export function parseWebSocketLogEntry(
  log: unknown,
  id = nextWebSocketFrameId(),
): NetworkWebSocketFrame | null {
  if (!log || typeof log !== 'object') {
    return null
  }

  const record = log as Record<string, unknown>
  const direction = normalizeDirection(record.direction)
  if (!direction) {
    return null
  }

  const parsed = parseMessageVariant(record.message)
  if (!parsed) {
    return null
  }

  const timestamp = typeof record.timestamp === 'number' ? record.timestamp : 0

  return {
    id,
    direction,
    timestamp,
    opcode: parsed.opcode,
    bytes: parsed.bytes,
    closeCode: parsed.closeCode,
    previewLabel: buildPreviewLabel(parsed.opcode, parsed.bytes, parsed.closeCode),
  }
}

export function parseWebSocketLogPayload(
  payload: Record<string, unknown> | null,
): NetworkWebSocketFrame | null {
  if (!payload) {
    return null
  }

  const log = payload.log ?? payload
  return parseWebSocketLogEntry(log)
}

export function parseWebSocketLogsFromSnapshot(
  messages: unknown,
): NetworkWebSocketFrame[] {
  if (!messages || typeof messages !== 'object') {
    return []
  }

  const record = messages as Record<string, unknown>
  const logs = record.message
  if (!Array.isArray(logs)) {
    return []
  }

  const frames: NetworkWebSocketFrame[] = []
  for (const entry of logs) {
    const frame = parseWebSocketLogEntry(entry)
    if (frame) {
      frames.push(frame)
    }
  }

  return frames
}

export function appendWebSocketFrame(
  current: NetworkWebSocketFrame[] | undefined,
  frame: NetworkWebSocketFrame,
): NetworkWebSocketFrame[] {
  const next = [...(current ?? []), frame]
  if (next.length <= MAX_WEBSOCKET_FRAMES) {
    return next
  }

  return next.slice(next.length - MAX_WEBSOCKET_FRAMES)
}
