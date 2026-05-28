<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed, ref } from 'vue'
import { ArrowLeft, X } from '@lucide/vue'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { RuleDraft, RuleEditorMode, RuleWorkbenchRuleItem } from '@/components/ui/rule-workbench'
import { createRuleDraft, isRuleSaveDisabled } from '@/components/ui/rule-workbench'
import RuleWorkbench from '@/components/ui/rule-workbench/RuleWorkbench.vue'
import type { ActionAssetTemplate } from './types'
import DrawerTabs from './DrawerTabs.vue'
import RulesListView from './RulesListView.vue'
import AssetsListView from './AssetsListView.vue'
import AssetEditorView from './AssetEditorView.vue'
import RuleEditorToolbar from './RuleEditorToolbar.vue'

export type PrimaryTabKey = 'rules' | 'assets'
export type SecondaryPaneKey = 'list' | 'editor'

const props = withDefaults(defineProps<{
  open: boolean
  activePrimaryTab?: PrimaryTabKey
  rulesPane?: SecondaryPaneKey
  assetsPane?: SecondaryPaneKey

  rules: RuleWorkbenchRuleItem[]
  selectedRuleId?: string
  ruleDraft?: RuleDraft

  assets: ActionAssetTemplate[]
  selectedAssetId?: string

  dirty?: boolean
  valid?: boolean
  invalid?: boolean
  loading?: boolean
  saving?: boolean
  class?: HTMLAttributes['class']
}>(), {
  activePrimaryTab: 'rules',
  rulesPane: 'list',
  assetsPane: 'list',
  selectedRuleId: '',
  selectedAssetId: '',
  ruleDraft: undefined,
  dirty: false,
  valid: true,
  invalid: false,
  loading: false,
  saving: false,
})

const emit = defineEmits<{
  'update:open': [open: boolean]
  'update:activePrimaryTab': [tab: PrimaryTabKey]
  'update:rulesPane': [pane: SecondaryPaneKey]
  'update:assetsPane': [pane: SecondaryPaneKey]
  'update:selectedRuleId': [id: string]
  'update:ruleDraft': [draft: RuleDraft]
  'update:selectedAssetId': [id: string]

  'rules:create': []
  'rules:edit': [id: string]
  'rules:save': [id: string]
  'rules:toggle-enabled': [id: string, enabled: boolean]

  'assets:create': [asset: ActionAssetTemplate]
  'assets:update': [asset: ActionAssetTemplate]
  'assets:remove': [id: string]
}>()

const tabs = computed(() => ([
  { key: 'rules', label: '规则', badge: props.activePrimaryTab === 'rules' && props.dirty ? '●' : undefined },
  { key: 'assets', label: '动作资产' },
]))

function close() {
  emit('update:open', false)
}

function openRulesList() {
  emit('update:activePrimaryTab', 'rules')
  emit('update:rulesPane', 'list')
}

function openRulesEditor() {
  emit('update:activePrimaryTab', 'rules')
  emit('update:rulesPane', 'editor')
}

function openAssetsList() {
  emit('update:activePrimaryTab', 'assets')
  emit('update:assetsPane', 'list')
}

function openAssetsEditor() {
  emit('update:activePrimaryTab', 'assets')
  emit('update:assetsPane', 'editor')
}

function onCreateRule() {
  emit('rules:create')
  emit('update:ruleDraft', createRuleDraft())
  openRulesEditor()
}

function onEditRule(id: string) {
  emit('rules:edit', id)
  emit('update:selectedRuleId', id)
  openRulesEditor()
}

function onSelectRule(id: string) {
  emit('update:selectedRuleId', id)
}

function onSaveRule(id: string) {
  emit('rules:save', id)
}

function onCreateAsset() {
  openAssetsEditor()
}

const selectedAsset = computed(() => {
  return props.assets.find(a => a.id === props.selectedAssetId) ?? null
})

const ruleSaveDisabled = computed(() => isRuleSaveDisabled({
  loading: props.loading,
  saving: props.saving,
  invalid: props.invalid,
  hasSelection: !!props.selectedRuleId,
}))

const editorMode = ref<RuleEditorMode>('visual')

const showDrawerBack = computed(() => (
  (props.activePrimaryTab === 'rules' && props.rulesPane === 'editor')
  || (props.activePrimaryTab === 'assets' && props.assetsPane === 'editor')
))

const isDetailPane = computed(() => showDrawerBack.value)

function onDrawerBack() {
  if (props.activePrimaryTab === 'rules') {
    openRulesList()
    return
  }
  openAssetsList()
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
          <div v-if="props.activePrimaryTab === 'rules'" class="flex h-full min-h-0 flex-col">
            <div v-if="props.rulesPane === 'list'" class="min-h-0 flex-1">
              <RulesListView
                :rules="props.rules"
                :selected-rule-id="props.selectedRuleId"
                class="h-full"
                @create="onCreateRule"
                @edit="onEditRule"
                @select="onSelectRule"
                @toggle-enabled="(id, enabled) => emit('rules:toggle-enabled', id, enabled)"
              />
            </div>

            <div v-else class="flex h-full min-h-0 flex-col">
              <RuleEditorToolbar
                :draft="props.ruleDraft"
                v-model:editor-mode="editorMode"
                :saving="props.saving"
                :save-disabled="ruleSaveDisabled"
                @update:draft="onRuleDraftUpdate"
                @save="props.selectedRuleId && onSaveRule(props.selectedRuleId)"
              />

              <RuleWorkbench
                v-model:editor-mode="editorMode"
                :rules="props.rules"
                :draft="props.ruleDraft"
                :selected-rule-id="props.selectedRuleId"
                :action-assets="props.assets"
                :dirty="props.dirty"
                :valid="props.valid"
                :invalid="props.invalid"
                :loading="props.loading"
                :saving="props.saving"
                embedded
                :show-list="false"
                class="min-h-0 flex-1"
                @update:draft="onRuleDraftUpdate"
                @update:selected-rule-id="emit('update:selectedRuleId', $event)"
                @save="onSaveRule"
                @save-action-asset="emit('assets:create', $event)"
              />
            </div>
          </div>

          <!-- Assets -->
          <div v-else class="flex h-full min-h-0 flex-col">
            <div v-if="props.assetsPane === 'list'" class="min-h-0 flex-1">
              <AssetsListView
                :assets="props.assets"
                :selected-asset-id="props.selectedAssetId"
                class="h-full"
                @create="onCreateAsset"
                @edit="id => { emit('update:selectedAssetId', id); openAssetsEditor() }"
                @select="emit('update:selectedAssetId', $event)"
              />
            </div>

            <div v-else class="min-h-0 flex-1">
              <AssetEditorView
                :asset="selectedAsset"
                class="h-full"
                @create="emit('assets:create', $event)"
                @update="emit('assets:update', $event)"
                @remove="emit('assets:remove', $event)"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>

