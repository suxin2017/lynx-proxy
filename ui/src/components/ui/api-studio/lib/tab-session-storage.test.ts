import { describe, expect, it } from 'vitest'
import {
  API_STUDIO_TAB_SESSION_VERSION,
  parseApiStudioTabSession,
  resolveActiveTabId,
} from './tab-session-storage'

describe('parseApiStudioTabSession', () => {
  it('parses request and history tabs', () => {
    const session = parseApiStudioTabSession(JSON.stringify({
      version: API_STUDIO_TAB_SESSION_VERSION,
      tabs: [
        { kind: 'request', requestNodeId: 'req-1', activeRequestTab: 'headers' },
        { kind: 'history', entryId: 'hist-1' },
      ],
      active: { kind: 'request', requestNodeId: 'req-1' },
      selectedId: 'req-1',
      sidebarView: 'collections',
    }))

    expect(session?.tabs).toHaveLength(2)
    expect(session?.tabs[0]).toMatchObject({ kind: 'request', requestNodeId: 'req-1' })
    expect(session?.active).toEqual({ kind: 'request', requestNodeId: 'req-1' })
  })

  it('rejects unknown version', () => {
    expect(parseApiStudioTabSession(JSON.stringify({ version: 99, tabs: [] }))).toBeNull()
  })

  it('drops invalid tab rows', () => {
    const session = parseApiStudioTabSession(JSON.stringify({
      version: API_STUDIO_TAB_SESSION_VERSION,
      tabs: [{ kind: 'request' }, { kind: 'history', entryId: 'h1' }],
    }))
    expect(session?.tabs).toEqual([{ kind: 'history', entryId: 'h1' }])
  })
})

describe('resolveActiveTabId', () => {
  it('resolves history tab id', () => {
    const id = resolveActiveTabId(
      { kind: 'history', entryId: 'hist-1' },
      [{ id: 'tab-history-hist-1', requestNodeId: '' }],
    )
    expect(id).toBe('tab-history-hist-1')
  })
})
