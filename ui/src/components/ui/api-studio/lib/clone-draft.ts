import { toRaw } from 'vue'
import type { ApiRequestDraft } from '../types'

/** Deep-clone a draft; safe for Pinia/Vue reactive proxies. */
export function cloneDraft(draft: ApiRequestDraft): ApiRequestDraft {
  const raw = toRaw(draft)
  try {
    return structuredClone(raw)
  }
  catch {
    return JSON.parse(JSON.stringify(raw)) as ApiRequestDraft
  }
}
