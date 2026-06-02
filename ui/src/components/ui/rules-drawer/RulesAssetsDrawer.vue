<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { ArrowLeft, X } from '@lucide/vue'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useRulesStore } from '@/stores/modules/rules.store'
import type { RuleDraft, RuleWorkbenchRuleItem } from '@/components/ui/rule-workbench'
import { createRuleDraft, getRuleValidationErrors, isRuleSaveDisabled } from '@/components/ui/rule-workbench'
import RuleWorkbench from '@/components/ui/rule-workbench/RuleWorkbench.vue'
import DrawerTabs from './DrawerTabs.vue'
import RulesListView from './RulesListView.vue'
import RuleEditorToolbar from './RuleEditorToolbar.vue'

export type PrimaryTabKey = 'rules'
export type SecondaryPaneKey = 'list' | 'editor'

const props = withDefaults(defineProps<{
  open: boolean
  activePrimaryTab?: PrimaryTabKey
  rulesPane?: SecondaryPaneKey

  rules: RuleWorkbenchRuleItem[]
  selectedRuleId?: string
  ruleDraft?: RuleDraft

  dirty?: boolean
  loading?: boolean
  saving?: boolean
  class?: HTMLAttributes['class']
}>(), {
  activePrimaryTab: 'rules',
  rulesPane: 'list',
  selectedRuleId: '',
  ruleDraft: undefined,
  dirty: false,
  loading: false,
  saving: false,
})

const emit = defineEmits<{
  'update:open': [open: boolean]
  'update:activePrimaryTab': [tab: PrimaryTabKey]
  'update:rulesPane': [pane: SecondaryPaneKey]
  'update:selectedRuleId': [id: string]
  'update:ruleDraft': [draft: RuleDraft]

  'rules:create': []
  'rules:edit': [id: string]
  'rules:save': [id: string]
  'rules:toggle-enabled': [id: string, enabled: boolean]
  'rules:reorder': [orderedIds: string[]]
  'rules:delete': [id: string]
}>()

const tabs = computed(() => ([
  { key: 'rules', label: '规则' },
]))

const rulesStore = useRulesStore()
const {
  rulesPane: storeRulesPane,
  selectedRuleId: storeSelectedRuleId,
  ruleDraft: storeRuleDraft,
  reordering: storeReordering,
} = storeToRefs(rulesStore)

/** Store is source of truth; props mirror v-model for Storybook. */
const rulesPaneDisplay = computed(() => storeRulesPane.value ?? props.rulesPane ?? 'list')

function setRulesPane(pane: SecondaryPaneKey) {
  storeRulesPane.value = pane
  emit('update:rulesPane', pane)
}

function close() {
  emit('update:open', false)
}

function openRulesList() {
  emit('update:activePrimaryTab', 'rules')
  rulesStore.goToRulesList()
  setRulesPane('list')
}

function openRulesEditor() {
  emit('update:activePrimaryTab', 'rules')
  setRulesPane('editor')
}

function onCreateRule() {
  emit('rules:create')
  emit('update:ruleDraft', createRuleDraft())
  openRulesEditor()
}

function onEditRule(id: string) {
  openRulesEditor()
  emit('update:selectedRuleId', id)
  emit('rules:edit', id)
}

function onSelectRule(id: string) {
  emit('update:selectedRuleId', id)
}

async function onDuplicateRule(id: string) {
  try {
    await rulesStore.duplicateRule(id)
  } catch {
    return
  }

  if (storeSelectedRuleId.value) {
    emit('update:selectedRuleId', storeSelectedRuleId.value)
  }
  if (storeRuleDraft.value) {
    emit('update:ruleDraft', storeRuleDraft.value)
  }
  openRulesEditor()
}

function onDeleteRule(id: string) {
  const name = props.rules.find(rule => rule.id === id)?.name ?? '该规则'
  if (!globalThis.confirm(`确定删除规则「${name}」？此操作不可撤销。`)) {
    return
  }
  emit('rules:delete', id)
}

async function handleToolbarSave() {
  const id = props.selectedRuleId
    || props.ruleDraft?.id
    || rulesStore.selectedRuleId
    || rulesStore.ruleDraft?.id
  if (!id) return
  try {
    await rulesStore.saveRule(id)
  } catch {
    return
  }
  openRulesList()
}

const ruleSaveDisabled = computed(() => {
  const draft = props.ruleDraft ?? createRuleDraft()
  return isRuleSaveDisabled({
    loading: props.loading,
    saving: props.saving,
    invalid: getRuleValidationErrors(draft).length > 0,
    hasSelection: !!props.selectedRuleId,
  })
})

const showDrawerBack = computed(() => (
  (props.activePrimaryTab === 'rules' && rulesPaneDisplay.value === 'editor')
))

const isDetailPane = computed(() => showDrawerBack.value)

function onDrawerBack() {
  openRulesList()
}

function onRuleDraftUpdate(next: RuleDraft) {
  const prev = props.ruleDraft
  emit('update:ruleDraft', next)
  if (!props.selectedRuleId || !prev) return
  if (next.enabled !== prev.enabled) {
    emit('rules:toggle-enabled', props.selectedRuleId, next.enabled)
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.open"
      class="fixed inset-0 z-50 flex justify-end bg-black/40"
      @click.self="close"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="规则与动作资产"
        :class="cn(
          'flex h-full w-full max-w-[980px] flex-col bg-background shadow-2xl',
          props.class,
        )"
      >
        <DrawerTabs
          :model-value="props.activePrimaryTab"
          :tabs="tabs"
          trailing
          @update:model-value="emit('update:activePrimaryTab', $event as any)"
        >
          <template #trailing>
            <Button
              v-if="showDrawerBack"
              variant="ghost"
              size="sm"
              class="h-8 shrink-0 px-2 text-xs"
              aria-label="返回列表"
              @click="onDrawerBack"
            >
              <ArrowLeft class="h-3.5 w-3.5" />
              返回
            </Button>
            <Button size="icon-sm" variant="ghost" class="h-8 w-8" @click="close" aria-label="关闭抽屉">
              <X class="h-4 w-4" />
            </Button>
          </template>
        </DrawerTabs>

        <div
          class="min-h-0 flex-1 overflow-x-hidden overflow-y-hidden"
          :class="isDetailPane ? 'px-3 pb-3 pt-0' : 'p-3'"
        >
          <!-- Rules -->
          <div class="flex h-full min-h-0 flex-col">
            <div v-if="rulesPaneDisplay === 'list'" class="min-h-0 flex-1">
              <RulesListView
                :rules="props.rules"
                :selected-rule-id="props.selectedRuleId"
                :reordering="storeReordering"
                class="h-full"
                @create="onCreateRule"
                @edit="onEditRule"
                @duplicate="onDuplicateRule"
                @select="onSelectRule"
                @toggle-enabled="(id, enabled) => emit('rules:toggle-enabled', id, enabled)"
                @reorder="ids => emit('rules:reorder', ids)"
                @delete="onDeleteRule"
              />
            </div>

            <div v-else class="flex h-full min-h-0 flex-col">
              <RuleEditorToolbar
                :draft="props.ruleDraft"
                :saving="props.saving"
                :save-disabled="ruleSaveDisabled"
                @update:draft="onRuleDraftUpdate"
                @save="handleToolbarSave"
              />

              <RuleWorkbench
                :rules="props.rules"
                :draft="props.ruleDraft"
                :selected-rule-id="props.selectedRuleId"
                :dirty="props.dirty"
                :loading="props.loading"
                :saving="props.saving"
                embedded
                :show-list="false"
                class="min-h-0 flex-1"
                @update:draft="onRuleDraftUpdate"
                @update:selected-rule-id="emit('update:selectedRuleId', $event)"
                @save="handleToolbarSave"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>

