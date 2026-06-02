import { MAX_BODY_STORE_BYTES } from './body-display-limits'

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const slice = bytes.subarray(index, index + chunkSize)
    binary += String.fromCharCode(...slice)
  }
  return btoa(binary)
}

export function snapshotBodyToBytes(value: unknown): Uint8Array | undefined {
  if (value == null || value === '') {
    return undefined
  }

  if (typeof value === 'string') {
    try {
      return base64ToBytes(value)
    }
    catch {
      return new TextEncoder().encode(value)
    }
  }

  return new TextEncoder().encode(JSON.stringify(value))
}

/**
 * Extracts a body chunk from a WS payload. Returns `undefined` when the frame
 * should not update stored body (missing field or explicit null terminator).
 */
export function extractBodyChunk(
  payload: Record<string, unknown> | null,
): Uint8Array | undefined {
  if (!payload) {
    return undefined
  }

  if (!('body' in payload || 'data' in payload)) {
    return undefined
  }

  const raw = payload.body ?? payload.data
  if (raw === null || raw === undefined) {
    return undefined
  }

  if (typeof raw !== 'string') {
    return new TextEncoder().encode(String(raw))
  }

  try {
    return base64ToBytes(raw)
  }
  catch {
    return new TextEncoder().encode(raw)
  }
}

export type AppendBodyResult = {
  bytes: Uint8Array
  truncated: boolean
}

export function appendBodyBytes(
  current: Uint8Array | undefined,
  chunk: Uint8Array,
  maxBytes = MAX_BODY_STORE_BYTES,
): AppendBodyResult {
  if (chunk.length === 0) {
    return {
      bytes: current ?? new Uint8Array(0),
      truncated: (current?.length ?? 0) >= maxBytes,
    }
  }

  const previous = current ?? new Uint8Array(0)
  const combinedLength = previous.length + chunk.length

  if (combinedLength <= maxBytes) {
    const combined = new Uint8Array(combinedLength)
    combined.set(previous, 0)
    combined.set(chunk, previous.length)
    return { bytes: combined, truncated: false }
  }

  if (previous.length >= maxBytes) {
    return { bytes: previous, truncated: true }
  }

  const allowed = maxBytes - previous.length
  const combined = new Uint8Array(maxBytes)
  combined.set(previous, 0)
  combined.set(chunk.subarray(0, allowed), previous.length)
  return { bytes: combined, truncated: true }
}

export function contentTypeFromHeaders(
  headers: Record<string, string> | undefined,
): string | undefined {
  if (!headers) {
    return undefined
  }

  const entry = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === 'content-type',
  )

  return entry?.[1]
}
