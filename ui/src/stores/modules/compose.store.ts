import { ref } from 'vue'
import { defineStore } from 'pinia'
import { WsOp } from '@/lib/generated/ws/v1'
import type { ComposeDraft, ComposeResponse } from '@/components/ui/compose'
import { createEmptyDraft } from '@/components/ui/compose'
import { useWsConnectionStore } from './ws-connection.store'

export const useComposeStore = defineStore('compose', () => {
  const draft = ref<ComposeDraft>(createEmptyDraft())
  const response = ref<ComposeResponse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const ws = useWsConnectionStore()

  function setDraft(next: ComposeDraft) {
    draft.value = next
    response.value = null
    error.value = null
  }

  function reset() {
    response.value = null
    error.value = null
  }

  async function send(current?: ComposeDraft) {
    const value = current ?? draft.value
    if (!value.url?.trim()) {
      return
    }

    loading.value = true
    error.value = null
    response.value = null

    try {
      const res = await ws.call<ComposeResponse, ComposeDraft>(WsOp.ComposeRequestSend, value)
      response.value = res
      if (res?.errorMessage) {
        error.value = res.errorMessage
      }
    } catch (err) {
      error.value = String(err)
    } finally {
      loading.value = false
    }
  }

  return {
    draft,
    response,
    loading,
    error,
    setDraft,
    reset,
    send,
  }
})

