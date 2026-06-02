import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { RuleDraft, RuleWorkbenchRuleItem } from '@/components/ui/rule-workbench'
import { createRuleDraft } from '@/components/ui/rule-workbench'
type PrimaryTabKey = 'rules' | 'assets'
type SecondaryPaneKey = 'list' | 'editor'
import {
  cloneDraft,
  draftToRequestRule,
  parseRuleId,
  requestRuleToDraft,
  requestRuleToListItem,
  ruleIdToString,
} from '@/lib/ws/rules-mapper'
import { useWsConnectionStore } from './ws-connection.store'
import { WsOp } from '@/lib/generated/ws/v1'
import type { RequestRuleDto, RulesListResponse } from '@/lib/ws/rules-types'

export const useRulesStore = defineStore('rules', () => {
  const open = ref(false)
  const activePrimaryTab = ref<PrimaryTabKey>('rules')
  const rulesPane = ref<SecondaryPaneKey>('list')
  const assetsPane = ref<SecondaryPaneKey>('list')

  const rules = ref<RuleWorkbenchRuleItem[]>([])
  const selectedRuleId = ref('')
  const ruleDraft = ref<RuleDraft | undefined>(undefined)
  const savedDraft = ref<RuleDraft | undefined>(undefined)

  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  const wsConnectionStore = useWsConnectionStore()

  const isDirty = computed(() => {
    if (!ruleDraft.value || !savedDraft.value) {
      return Boolean(ruleDraft.value && !savedDraft.value)
    }
    return JSON.stringify(ruleDraft.value) !== JSON.stringify(savedDraft.value)
  })

  async function refreshRules() {
    loading.value = true
    error.value = null
    try {
      const result = await wsConnectionStore.call<RulesListResponse>(WsOp.RulesListGet)
      rules.value = (result?.rules ?? []).map(requestRuleToListItem)
    } catch (err) {
      error.value = String(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function openDrawer() {
    open.value = true
    await refreshRules()
  }

  function closeDrawer() {
    open.value = false
  }

  async function loadRuleDraft(ruleId: string) {
    const numericId = parseRuleId(ruleId)
    if (numericId == null) {
      ruleDraft.value = createRuleDraft({ id: ruleId })
      savedDraft.value = cloneDraft(ruleDraft.value)
      return
    }

    loading.value = true
    error.value = null
    try {
      const rule = await wsConnectionStore.call<RequestRuleDto>(WsOp.RulesGet, { ruleId: numericId })
      ruleDraft.value = requestRuleToDraft(rule)
      savedDraft.value = cloneDraft(ruleDraft.value)
      selectedRuleId.value = ruleIdToString(rule.id)
    } catch (err) {
      error.value = String(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function editRule(id: string) {
    selectedRuleId.value = id
    await loadRuleDraft(id)
  }

  function createRule() {
    const draft = createRuleDraft()
    ruleDraft.value = draft
    savedDraft.value = cloneDraft(draft)
    selectedRuleId.value = draft.id
    rulesPane.value = 'editor'
  }

  function updateRuleDraft(next: RuleDraft) {
    ruleDraft.value = next
    const id = selectedRuleId.value
    if (!id) return
    rules.value = rules.value.map((rule: RuleWorkbenchRuleItem) => (
      rule.id === id
        ? { ...rule, name: next.name, enabled: next.enabled }
        : rule
    ))
  }

  function goToRulesList() {
    rulesPane.value = 'list'
  }

  function clearRuleEditor() {
    selectedRuleId.value = ''
    ruleDraft.value = undefined
    savedDraft.value = undefined
  }

  async function deleteRule(id: string) {
    const wasSelected = selectedRuleId.value === id
    const ruleId = parseRuleId(id)
    error.value = null

    if (ruleId == null) {
      rules.value = rules.value.filter((rule: RuleWorkbenchRuleItem) => rule.id !== id)
      if (wasSelected) {
        clearRuleEditor()
        goToRulesList()
      }
      return
    }

    try {
      await wsConnectionStore.call(WsOp.RulesDelete, { ruleId })
      if (wasSelected) {
        clearRuleEditor()
        goToRulesList()
      }
      try {
        await refreshRules()
      } catch (refreshErr) {
        error.value = String(refreshErr)
      }
    } catch (err) {
      error.value = String(err)
      throw err
    }
  }

  async function saveRule(_id?: string) {
    if (!ruleDraft.value) {
      throw new Error('没有可保存的规则草稿')
    }
    saving.value = true
    error.value = null
    try {
      const payload = draftToRequestRule(ruleDraft.value)
      const saved = await wsConnectionStore.call<RequestRuleDto>(
        WsOp.RulesSaveSet,
        payload as unknown as Record<string, unknown>,
      )
      ruleDraft.value = requestRuleToDraft(saved)
      savedDraft.value = cloneDraft(ruleDraft.value)
      selectedRuleId.value = ruleIdToString(saved.id)
      goToRulesList()
      try {
        await refreshRules()
      } catch (refreshErr) {
        error.value = String(refreshErr)
      }
    } catch (err) {
      error.value = String(err)
      throw err
    } finally {
      saving.value = false
    }
  }

  async function toggleRuleEnabled(id: string, enabled: boolean) {
    const ruleId = parseRuleId(id)
    if (ruleId == null) {
      rules.value = rules.value.map((rule: RuleWorkbenchRuleItem) => (
        rule.id === id ? { ...rule, enabled } : rule
      ))
      if (ruleDraft.value?.id === id) {
        ruleDraft.value = { ...ruleDraft.value, enabled }
      }
      return
    }

    error.value = null
    try {
      const updated = await wsConnectionStore.call<RequestRuleDto>(WsOp.RulesEnabledSet, {
        ruleId,
        enabled,
      })
      rules.value = rules.value.map((rule: RuleWorkbenchRuleItem) => (
        rule.id === id
          ? { ...requestRuleToListItem(updated), id }
          : rule
      ))
      if (selectedRuleId.value === id && ruleDraft.value) {
        ruleDraft.value = { ...ruleDraft.value, enabled }
        if (savedDraft.value) {
          savedDraft.value = { ...savedDraft.value, enabled }
        }
      }
    } catch (err) {
      error.value = String(err)
      throw err
    }
  }

  return {
    open,
    activePrimaryTab,
    rulesPane,
    assetsPane,
    rules,
    selectedRuleId,
    ruleDraft,
    loading,
    saving,
    error,
    isDirty,
    openDrawer,
    closeDrawer,
    refreshRules,
    editRule,
    createRule,
    updateRuleDraft,
    saveRule,
    goToRulesList,
    toggleRuleEnabled,
    deleteRule,
  }
})
