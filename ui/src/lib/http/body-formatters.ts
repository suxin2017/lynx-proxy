import type { WorkbenchType } from '@/components/ui/content-workbench/utils'
import { decodeBytes, parseCharset } from './body-charset'
import { bytesToBase64 } from './body-transport'

export type FormFieldRow = {
  key: string
  value: string
}

export type SseEventRow = {
  id?: string
  event?: string
  data: string
}

export function bodyKindToWorkbenchType(kind: string): WorkbenchType {
  switch (kind) {
    case 'json':
      return 'json'
    case 'html':
      return 'html-source'
    case 'xml':
      return 'xml-source'
    case 'css':
      return 'css-source'
    case 'javascript':
      return 'javascript-source'
    default:
      return 'text'
  }
}

export function formatJsonBody(bytes: Uint8Array, contentType?: string): {
  display: string
  hasFormattingError: boolean
} {
  const { text } = decodeBytes(bytes, parseCharset(contentType))

  try {
    const parsed = JSON.parse(text)
    return {
      display: JSON.stringify(parsed, null, 2),
      hasFormattingError: false,
    }
  }
  catch (error) {
    return {
      display: JSON.stringify({
        error: 'JSON 解析失败',
        reason: error instanceof Error ? error.message : String(error),
        raw: text,
      }, null, 2),
      hasFormattingError: true,
    }
  }
}

export function formatTextBody(bytes: Uint8Array, contentType?: string): string {
  return decodeBytes(bytes, parseCharset(contentType)).text
}

/** Normalize SSE wire format to LF-separated lines for display. */
export function formatSseBody(bytes: Uint8Array, contentType?: string): string {
  const text = decodeBytes(bytes, parseCharset(contentType)).text
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

/** Base64 transport encoding for CodeMirror display (MIME-style 76-char lines). */
export function formatBase64Body(bytes: Uint8Array, lineWidth = 76): string {
  const encoded = bytesToBase64(bytes)
  if (encoded.length <= lineWidth) {
    return encoded
  }

  const lines: string[] = []
  for (let index = 0; index < encoded.length; index += lineWidth) {
    lines.push(encoded.slice(index, index + lineWidth))
  }

  return lines.join('\n')
}

export function formatHexDump(bytes: Uint8Array, bytesPerLine = 16): string {
  const lines: string[] = []

  for (let offset = 0; offset < bytes.length; offset += bytesPerLine) {
    const slice = bytes.subarray(offset, offset + bytesPerLine)
    const address = offset.toString(16).padStart(8, '0').toUpperCase()
    const hex = [...slice]
      .map(byte => byte.toString(16).padStart(2, '0').toUpperCase())
      .join(' ')
    lines.push(`${address}  ${hex}`)
  }

  return lines.join('\n')
}

export function formatUrlEncodedForm(bytes: Uint8Array, contentType?: string): FormFieldRow[] {
  const text = decodeBytes(bytes, parseCharset(contentType)).text
  const params = new URLSearchParams(text)
  const rows: FormFieldRow[] = []

  for (const [key, value] of params.entries()) {
    rows.push({ key, value })
  }

  return rows
}

export function formatMultipartForm(bytes: Uint8Array, contentType?: string): FormFieldRow[] {
  const text = decodeBytes(bytes, parseCharset(contentType)).text
  const boundaryMatch = contentType?.match(/boundary=([^;\s]+)/i)
  const boundary = boundaryMatch?.[1]?.replace(/^["']|["']$/g, '')

  if (!boundary) {
    const display = text.length > 512 ? `${text.slice(0, 512)}…` : text
    return [{ key: '(raw)', value: display }]
  }

  const parts = text.split(`--${boundary}`).filter(part => part.trim() && part.trim() !== '--')
  const rows: FormFieldRow[] = []

  for (const part of parts) {
    const trimmed = part.replace(/^\r?\n/, '').replace(/\r?\n$/, '')
    const separator = trimmed.indexOf('\r\n\r\n')
    if (separator < 0) {
      continue
    }

    const headerBlock = trimmed.slice(0, separator)
    const body = trimmed.slice(separator + 4).replace(/\r?\n$/, '')
    const disposition = headerBlock
      .split(/\r?\n/)
      .find(line => line.toLowerCase().startsWith('content-disposition'))

    const nameMatch = disposition?.match(/name="([^"]+)"/)
    const filenameMatch = disposition?.match(/filename="([^"]+)"/)
    const name = nameMatch?.[1] ?? '(unknown)'

    if (filenameMatch) {
      rows.push({
        key: name,
        value: `${filenameMatch[1]} · ${body.length} bytes`,
      })
    }
    else {
      const display = body.length > 512 ? `${body.slice(0, 512)}…` : body
      rows.push({ key: name, value: display })
    }
  }

  return rows
}

export function parseSseEvents(bytes: Uint8Array, contentType?: string): SseEventRow[] {
  const text = formatSseBody(bytes, contentType)
  const blocks = text.split(/\n\n+/)
  const events: SseEventRow[] = []

  for (const block of blocks) {
    const lines = block.split(/\n/).filter(Boolean)
    if (lines.length === 0) {
      continue
    }

    let id: string | undefined
    let event: string | undefined
    const dataLines: string[] = []

    for (const line of lines) {
      if (line.startsWith('id:')) {
        id = line.slice(3).trim()
      }
      else if (line.startsWith('event:')) {
        event = line.slice(6).trim()
      }
      else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart())
      }
      else if (line.startsWith(':')) {
        continue
      }
      else {
        dataLines.push(line)
      }
    }

    if (dataLines.length > 0) {
      events.push({
        id,
        event,
        data: dataLines.join('\n'),
      })
    }
  }

  return events
}
