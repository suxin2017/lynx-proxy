import { describe, expect, it } from 'vitest'
import type { ApiRequestHistoryEntry } from '../types'
import {
  findLatestHistoryEntryForTab,
  mergeHistoryEntryWithSnapshot,
  normalizeComposeResponse,
  normalizeHistoryEntry,
  responseFromHistoryEntry,
  snapshotDraftForHistory,
  snapshotResponseForHistory,
} from './history-response'
import { createEmptyApiDraft } from './empty-api-draft'

describe('normalizeComposeResponse', () => {
  it('coerces missing body to empty string', () => {
    const res = normalizeComposeResponse({
      status: 200,
      statusText: 'OK',
      headers: {},
      body: undefined as unknown as string,
      responseTime: 1,
      size: 0,
    })
    expect(res?.body).toBe('')
  })
})

describe('snapshotDraftForHistory', () => {
  it('keeps request body', () => {
    const draft = createEmptyApiDraft({ body: '{"x":1}' })
    expect(snapshotDraftForHistory(draft).body).toBe('{"x":1}')
  })
})

describe('snapshotResponseForHistory', () => {
  it('keeps response body', () => {
    const snap = snapshotResponseForHistory({
      status: 200,
      statusText: 'OK',
      headers: {},
      body: '{"ok":true}',
      responseTime: 5,
      size: 11,
    })
    expect(snap?.body).toBe('{"ok":true}')
  })
})

describe('findLatestHistoryEntryForTab', () => {
  it('prefers linked history entry id', () => {
    const entries = [
      {
        id: 'old',
        sentAt: 1,
        method: 'GET',
        url: 'https://a.com',
        requestNodeId: 'req-1',
        response: { status: 200, statusText: 'OK', headers: {}, body: 'old', responseTime: 1, size: 3 },
        draft: createEmptyApiDraft(),
      },
      {
        id: 'new',
        sentAt: 2,
        method: 'GET',
        url: 'https://a.com',
        requestNodeId: 'req-1',
        response: { status: 200, statusText: 'OK', headers: {}, body: 'new', responseTime: 1, size: 3 },
        draft: createEmptyApiDraft(),
      },
    ] satisfies ApiRequestHistoryEntry[]
    const found = findLatestHistoryEntryForTab(
      { id: 'tab-1', requestNodeId: 'req-1', lastHistoryEntryId: 'old' },
      entries,
    )
    expect(found?.id).toBe('old')
    expect(found?.response?.body).toBe('old')
  })
})

describe('mergeHistoryEntryWithSnapshot', () => {
  it('fills missing server response body from client snapshot', () => {
    const entry = {
      id: 'h1',
      sentAt: 1,
      method: 'GET',
      url: 'https://example.com',
      draft: { name: '', method: 'GET', url: '', queryParams: [], headers: [], body: '', cookies: [], settings: { timeoutMs: 30000, followRedirects: true, validateSsl: true } },
    } satisfies ApiRequestHistoryEntry
    const draft = createEmptyApiDraft({ body: '{"req":1}' })
    const snapshot = {
      status: 200,
      statusText: 'OK',
      headers: {},
      body: '{"ok":true}',
      responseTime: 10,
      size: 11,
    }
    const merged = mergeHistoryEntryWithSnapshot(entry, draft, snapshot)
    expect(merged.response?.body).toBe('{"ok":true}')
    expect(merged.draft.body).toBe('{"req":1}')
  })
})

describe('normalizeHistoryEntry', () => {
  it('keeps stored response body', () => {
    const entry = {
      id: 'h2',
      sentAt: 1,
      method: 'POST',
      url: 'https://api.example.com',
      draft: createEmptyApiDraft({ body: 'x' }),
      response: {
        status: 200,
        statusText: 'OK',
        headers: {},
        body: 'hello',
        responseTime: 1,
        size: 5,
      },
    } satisfies ApiRequestHistoryEntry
    expect(normalizeHistoryEntry(entry).response?.body).toBe('hello')
  })
})

describe('responseFromHistoryEntry', () => {
  it('returns stored response when present', () => {
    const entry = {
      id: 'h1',
      sentAt: 1,
      method: 'GET',
      url: 'https://example.com',
      draft: { name: '', method: 'GET', url: '', queryParams: [], headers: [], body: '', cookies: [], settings: { timeoutMs: 30000, followRedirects: true, validateSsl: true } },
      response: {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        body: '{"ok":true}',
        responseTime: 12,
        size: 14,
      },
    } satisfies ApiRequestHistoryEntry

    expect(responseFromHistoryEntry(entry)?.body).toBe('{"ok":true}')
  })

  it('falls back to status metadata for legacy entries', () => {
    const entry = {
      id: 'h2',
      sentAt: 1,
      method: 'POST',
      url: 'https://api.example.com',
      status: 404,
      statusText: 'Not Found',
      durationMs: 99,
      draft: { name: '', method: 'POST', url: '', queryParams: [], headers: [], body: '', cookies: [], settings: { timeoutMs: 30000, followRedirects: true, validateSsl: true } },
    } satisfies ApiRequestHistoryEntry

    const res = responseFromHistoryEntry(entry)
    expect(res?.status).toBe(404)
    expect(res?.body).toBe('')
  })
})
