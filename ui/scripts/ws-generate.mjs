import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const protocolPath = path.resolve(rootDir, '../crates/lynx-core/protocol/ws.v1.asyncapi.yaml')
const outputPath = path.resolve(rootDir, 'src/lib/generated/ws/v1.ts')

const protocolText = fs.readFileSync(protocolPath, 'utf8')

const readEnum = (schemaName) => {
  const schemaBlock = new RegExp(`${schemaName}:[\\s\\S]*?enum:\\s*\\[([^\\]]+)\\]`, 'm')
  const match = protocolText.match(schemaBlock)
  if (!match) {
    throw new Error(`Failed to resolve enum for schema: ${schemaName}`)
  }

  return match[1]
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

const readOps = (kind) => {
  const lines = protocolText.split('\n')
  const startIndex = lines.findIndex((line) => line.trim() === 'x-lynx-ops:')
  if (startIndex < 0) {
    return []
  }

  let inRequestedKind = false
  const ops = []

  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const line = lines[i]

    if (line.trim().length === 0) {
      continue
    }

    if (!line.startsWith(' ')) {
      break
    }

    if (line.startsWith(`  ${kind}:`)) {
      inRequestedKind = true
      continue
    }

    if (line.startsWith('  ') && !line.startsWith('    ')) {
      inRequestedKind = false
      continue
    }

    if (inRequestedKind && line.startsWith('    - ')) {
      ops.push(line.replace('    - ', '').trim())
    }
  }

  return ops
}

const [protocolVersion] = readEnum('Version')
if (!protocolVersion) {
  throw new Error('Protocol version is empty')
}

const frameKinds = readEnum('FrameKind')
if (frameKinds.length === 0) {
  throw new Error('FrameKind enum is empty')
}

const requestOps = readOps('request')
const eventOps = readOps('event')

const asPascalCase = (value) => {
  return value
    .split(/[_-]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

const asSafeConstName = (value) => {
  return asPascalCase(value.replace(/[^a-zA-Z0-9]+/g, '_'))
}

const frameKindObject = frameKinds
  .map((kind) => `  ${asPascalCase(kind)}: '${kind}',`)
  .join('\n')

const wsOpObject = [...requestOps, ...eventOps]
  .map((op) => `  ${asSafeConstName(op)}: '${op}',`)
  .join('\n')

const requestOpUnion = requestOps.map((op) => `  | '${op}'`).join('\n') || '  | never'
const eventOpUnion = eventOps.map((op) => `  | '${op}'`).join('\n') || '  | never'

const generated = `/* eslint-disable */
// Generated from crates/lynx-core/protocol/ws.v1.asyncapi.yaml. Do not edit manually.

export const WS_PROTOCOL_VERSION = '${protocolVersion}' as const

export type WsProtocolVersion = typeof WS_PROTOCOL_VERSION

export const WsFrameKind = {
${frameKindObject}
} as const

export type WsFrameKind = (typeof WsFrameKind)[keyof typeof WsFrameKind]

export const WsOp = {
${wsOpObject}
} as const

export type WsRequestOp =
${requestOpUnion}

export type WsEventOp =
${eventOpUnion}

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
`

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, generated, 'utf8')

process.stdout.write(`Generated ${path.relative(rootDir, outputPath)} from backend protocol\n`)
