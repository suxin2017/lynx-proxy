import type { ComposeDraft } from '../types'

export function createEmptyDraft(overrides: Partial<ComposeDraft> = {}): ComposeDraft {
  return {
    name: 'Untitled',
    method: 'GET',
    url: '',
    queryParams: [],
    headers: [],
    body: '',
    timeout: 30,
    ...overrides,
  }
}
