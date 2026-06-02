import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { WsOp } from '@/lib/generated/ws/v1'
import { useWsConnectionStore } from './ws-connection.store'

export type CaptureRuleDto = {
  id: number
  name: string
  enabled: boolean
  matchExpr: string
  createdAt: number
  updatedAt: number
}

type RulesListResponse = {
  rules?: CaptureRuleDto[]
}

type UpsertPayload = {
  id?: number
  name: string
  enabled: boolean
  matchExpr: string
}

type DeletePayload = {
  ruleId: number
}

export const useCaptureRulesStore = defineStore('captureRules', () => {
  const open = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const focusRules = ref<CaptureRuleDto[]>([])
  const ignoreRules = ref<CaptureRuleDto[]>([])

  const ws = useWsConnectionStore()

  const anyFocusEnabled = computed(() => focusRules.value.some(r => r.enabled))

  async function refresh() {
    loading.value = true
    error.value = null
    try {
      const [focusRes, ignoreRes] = await Promise.all([
        ws.call<RulesListResponse>(WsOp.CaptureRulesFocusListGet),
        ws.call<RulesListResponse>(WsOp.CaptureRulesIgnoreListGet),
      ])
      focusRules.value = focusRes?.rules ?? []
      ignoreRules.value = ignoreRes?.rules ?? []
    } catch (err) {
      error.value = String(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function upsertFocus(payload: UpsertPayload) {
    error.value = null
    const saved = await ws.call<CaptureRuleDto>(WsOp.CaptureRulesFocusUpsert, payload as any)
    await refresh()
    return saved
  }

  async function upsertIgnore(payload: UpsertPayload) {
    error.value = null
    const saved = await ws.call<CaptureRuleDto>(WsOp.CaptureRulesIgnoreUpsert, payload as any)
    await refresh()
    return saved
  }

  async function deleteFocus(ruleId: number) {
    error.value = null
    await ws.call(WsOp.CaptureRulesFocusDelete, { ruleId } satisfies DeletePayload as any)
    focusRules.value = focusRules.value.filter(r => r.id !== ruleId)
  }

  async function deleteIgnore(ruleId: number) {
    error.value = null
    await ws.call(WsOp.CaptureRulesIgnoreDelete, { ruleId } satisfies DeletePayload as any)
    ignoreRules.value = ignoreRules.value.filter(r => r.id !== ruleId)
  }

  async function clearAll() {
    error.value = null
    const focusIds = focusRules.value.map(r => r.id)
    const ignoreIds = ignoreRules.value.map(r => r.id)
    loading.value = true
    try {
      for (const id of focusIds) {
        await ws.call(WsOp.CaptureRulesFocusDelete, { ruleId: id } satisfies DeletePayload as any)
      }
      for (const id of ignoreIds) {
        await ws.call(WsOp.CaptureRulesIgnoreDelete, { ruleId: id } satisfies DeletePayload as any)
      }
      focusRules.value = []
      ignoreRules.value = []
    } finally {
      loading.value = false
    }
  }

  return {
    open,
    loading,
    error,
    focusRules,
    ignoreRules,
    anyFocusEnabled,
    refresh,
    upsertFocus,
    upsertIgnore,
    deleteFocus,
    deleteIgnore,
    clearAll,
  }
})

