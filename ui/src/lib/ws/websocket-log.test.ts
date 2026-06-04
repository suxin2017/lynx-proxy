import { describe, expect, it } from 'vitest'
import { bytesToBase64 } from '@/lib/http/body-transport'
import {
  appendWebSocketFrame,
  buildPreviewLabel,
  MAX_WEBSOCKET_FRAMES,
  parseWebSocketLogEntry,
  parseWebSocketLogPayload,
  parseWebSocketLogsFromSnapshot,
} from './websocket-log'

describe('parseWebSocketLogEntry', () => {
  it('parses clientToServer text frame', () => {
    const hello = bytesToBase64(new TextEncoder().encode('hello'))
    const frame = parseWebSocketLogEntry({
      direction: 'clientToServer',
      timestamp: 1000,
      message: { text: hello },
    }, 'f1')

    expect(frame).toMatchObject({
      id: 'f1',
      direction: 'clientToServer',
      timestamp: 1000,
      opcode: 'text',
      previewLabel: 'hello',
    })
    expect(new TextDecoder().decode(frame!.bytes)).toBe('hello')
  })

  it('normalizes PascalCase direction', () => {
    const frame = parseWebSocketLogEntry({
      direction: 'ServerToClient',
      timestamp: 2,
      message: { pong: null },
    })

    expect(frame?.direction).toBe('serverToClient')
    expect(frame?.opcode).toBe('pong')
  })

  it('parses close with code', () => {
    const frame = parseWebSocketLogEntry({
      direction: 'clientToServer',
      timestamp: 3,
      message: { close: [1000, null] },
    })

    expect(frame?.opcode).toBe('close')
    expect(frame?.previewLabel).toBe('close (1000)')
    expect(frame?.closeCode).toBe(1000)
  })
})

describe('parseWebSocketLogPayload', () => {
  it('reads log from websocket.message payload', () => {
    const payload = {
      traceId: 't1',
      log: {
        direction: 'serverToClient',
        timestamp: 5,
        message: { text: bytesToBase64(new TextEncoder().encode('pong')) },
      },
    }

    const frame = parseWebSocketLogPayload(payload)
    expect(frame?.direction).toBe('serverToClient')
    expect(frame?.previewLabel).toBe('pong')
  })
})

describe('parseWebSocketLogsFromSnapshot', () => {
  it('imports messages from cached snapshot', () => {
    const frames = parseWebSocketLogsFromSnapshot({
      message: [
        {
          direction: 'clientToServer',
          timestamp: 1,
          message: { text: bytesToBase64(new TextEncoder().encode('a')) },
        },
        {
          direction: 'serverToClient',
          timestamp: 2,
          message: { text: bytesToBase64(new TextEncoder().encode('b')) },
        },
      ],
    })

    expect(frames).toHaveLength(2)
    expect(frames[0]?.previewLabel).toBe('a')
    expect(frames[1]?.previewLabel).toBe('b')
  })
})

describe('appendWebSocketFrame', () => {
  it('truncates to MAX_WEBSOCKET_FRAMES', () => {
    const base = { id: 'x', direction: 'clientToServer' as const, timestamp: 0, opcode: 'ping' as const, bytes: new Uint8Array(), previewLabel: 'ping' }
    let list: ReturnType<typeof appendWebSocketFrame> = []

    for (let i = 0; i < MAX_WEBSOCKET_FRAMES + 5; i += 1) {
      list = appendWebSocketFrame(list, { ...base, id: `f-${i}`, timestamp: i })
    }

    expect(list).toHaveLength(MAX_WEBSOCKET_FRAMES)
    expect(list[0]?.timestamp).toBe(5)
  })
})

describe('buildPreviewLabel', () => {
  it('labels binary with byte length', () => {
    expect(buildPreviewLabel('binary', new Uint8Array(42))).toBe('binary (42 B)')
  })
})
