import { describe, expect, it } from 'vitest'
import {
  demoteTraceFromOrder,
  isRecordListable,
  mergePartialRequestRecord,
  promoteTraceToOrder,
  type PartialRequestRecord,
} from './request-stream-logic'
import { resolveSnapshotRequestUrl } from '@/lib/http/request-url'

type StreamState = {
  traceOrder: string[]
  recordsByTrace: Record<string, PartialRequestRecord>
}

function createStreamState(): StreamState {
  return {
    traceOrder: [],
    recordsByTrace: {},
  }
}

function updateRecord(state: StreamState, traceId: string, patch: PartialRequestRecord) {
  const current = state.recordsByTrace[traceId] ?? {}
  state.recordsByTrace[traceId] = mergePartialRequestRecord(current, patch)
}

function promoteToList(state: StreamState, traceId: string) {
  const record = state.recordsByTrace[traceId]
  if (!isRecordListable(record)) {
    return
  }

  state.traceOrder = promoteTraceToOrder(state.traceOrder, traceId)
}

function removeRecord(state: StreamState, traceId: string) {
  delete state.recordsByTrace[traceId]
  state.traceOrder = demoteTraceFromOrder(state.traceOrder, traceId)
}

function pruneIfIncomplete(state: StreamState, traceId: string) {
  if (!isRecordListable(state.recordsByTrace[traceId])) {
    removeRecord(state, traceId)
  }
}

function listableRecords(state: StreamState) {
  return state.traceOrder.filter((traceId) => isRecordListable(state.recordsByTrace[traceId]))
}

function applyRequestStart(
  state: StreamState,
  traceId: string,
  payload: { method?: string, url?: string },
) {
  updateRecord(state, traceId, {
    method: payload.method ?? 'GET',
    url: payload.url,
    status: 'pending',
    startAt: 1,
  })
  promoteToList(state, traceId)
}

function applyResponseStart(state: StreamState, traceId: string, status: number) {
  updateRecord(state, traceId, {
    statusCode: status,
    status: status >= 400 ? 'error' : 'success',
  })
}

function applyResponseEnd(state: StreamState, traceId: string) {
  updateRecord(state, traceId, {
    status: 'success',
    endAt: 2,
  })
  pruneIfIncomplete(state, traceId)
}

function applyRequestEnd(state: StreamState, traceId: string) {
  updateRecord(state, traceId, {
    endAt: 2,
  })
}

function applyCachedSnapshot(
  state: StreamState,
  snapshot: {
    traceId: string
    request?: { method?: string, url?: string, headers?: Record<string, string> }
    response?: { status?: number }
  },
) {
  const url = resolveSnapshotRequestUrl(snapshot)
  if (!url) {
    return
  }

  updateRecord(state, snapshot.traceId, {
    method: snapshot.request?.method,
    url,
    statusCode: snapshot.response?.status,
    status: 'success',
  })
  promoteToList(state, snapshot.traceId)
}

describe('promoteTraceToOrder', () => {
  it('appends new trace ids to the tail', () => {
    expect(promoteTraceToOrder(['a', 'b'], 'c')).toEqual(['a', 'b', 'c'])
  })

  it('does not duplicate existing trace ids', () => {
    expect(promoteTraceToOrder(['a', 'b'], 'a')).toEqual(['a', 'b'])
  })
})

describe('isRecordListable', () => {
  it('requires a non-empty url', () => {
    expect(isRecordListable(undefined)).toBe(false)
    expect(isRecordListable({ method: 'GET' })).toBe(false)
    expect(isRecordListable({ url: '' })).toBe(false)
    expect(isRecordListable({ url: 'https://example.com' })).toBe(true)
  })
})

describe('request stream visibility', () => {
  it('does not list response.start without request.start', () => {
    const state = createStreamState()

    applyResponseStart(state, 'trace-1', 200)

    expect(listableRecords(state)).toEqual([])
    expect(state.recordsByTrace['trace-1']?.statusCode).toBe(200)
  })

  it('lists after request.start even when response.start arrived first', () => {
    const state = createStreamState()

    applyResponseStart(state, 'trace-1', 200)
    applyRequestStart(state, 'trace-1', {
      method: 'GET',
      url: 'https://fonts.googleapis.com/css2',
    })

    expect(listableRecords(state)).toEqual(['trace-1'])
    expect(state.recordsByTrace['trace-1']).toMatchObject({
      url: 'https://fonts.googleapis.com/css2',
      statusCode: 200,
    })
  })

  it('prunes incomplete records on response.end', () => {
    const state = createStreamState()

    applyResponseStart(state, 'trace-1', 200)
    applyResponseEnd(state, 'trace-1')

    expect(listableRecords(state)).toEqual([])
    expect(state.recordsByTrace['trace-1']).toBeUndefined()
  })

  it('preserves body when request.end arrives before request.start', () => {
    const state = createStreamState()

    updateRecord(state, 'trace-1', { requestBody: '{"ok":true}' })
    applyRequestEnd(state, 'trace-1')
    applyRequestStart(state, 'trace-1', {
      method: 'POST',
      url: 'https://example.com/api',
    })

    expect(state.recordsByTrace['trace-1']?.requestBody).toBe('{"ok":true}')
    expect(listableRecords(state)).toEqual(['trace-1'])
  })

  it('keeps partial records on request.end until a listable snapshot exists', () => {
    const state = createStreamState()

    applyResponseStart(state, 'trace-1', 200)
    applyRequestEnd(state, 'trace-1')

    expect(listableRecords(state)).toEqual([])
    expect(state.recordsByTrace['trace-1']?.statusCode).toBe(200)
  })

  it('skips cached snapshots without request url', () => {
    const state = createStreamState()

    applyCachedSnapshot(state, {
      traceId: 'trace-1',
      response: { status: 200 },
    })

    expect(listableRecords(state)).toEqual([])
  })

  it('includes cached snapshots with request url', () => {
    const state = createStreamState()

    applyCachedSnapshot(state, {
      traceId: 'trace-1',
      request: {
        method: 'GET',
        url: 'https://example.com/api',
      },
      response: { status: 200 },
    })

    expect(listableRecords(state)).toEqual(['trace-1'])
    expect(state.recordsByTrace['trace-1']?.url).toBe('https://example.com/api')
  })
})
