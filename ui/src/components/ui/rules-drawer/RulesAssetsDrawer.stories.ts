import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { computed, ref, watch } from 'vue'
import { useRulesStore } from '@/stores/modules/rules.store'
import { Button } from '@/components/ui/button'
import type { RuleDraft, RuleWorkbenchRuleItem } from '@/components/ui/rule-workbench'
import { createRuleDraft, getRuleValidationErrors } from '@/components/ui/rule-workbench'
import RulesAssetsDrawer from './RulesAssetsDrawer.vue'
import type { ActionAssetTemplate } from './types'

const SAMPLE_RULES: RuleWorkbenchRuleItem[] = [
  {
    id: 'rule-001',
    name: 'Auth Header Rewrite',
    enabled: true,
    priority: 90,
    state: 'valid',
    summary: 'Match api.example.com and rewrite authorization header.',
  },
  {
    id: 'rule-002',
    name: 'Slow Network Sandbox',
    enabled: true,
    priority: 70,
    state: 'draft',
    summary: 'Inject delay for selected payment endpoints before request.',
  },
  {
    id: 'rule-003',
    name: 'Legacy Script Block',
    enabled: false,
    priority: 60,
    state: 'invalid',
    summary: 'Block old script origin with temporary 451 response.',
  },
]

const SAMPLE_ASSETS: ActionAssetTemplate[] = [
  {
    id: 'asset-block-403',
    name: '拦截 403',
    description: '命中后直接返回 403。',
    category: '拦截',
    type: 'block',
    seedConfig: { statusCode: 403, reason: 'Blocked by policy' },
  },
  {
    id: 'asset-delay-before',
    name: '请求前延迟',
    description: '在请求前增加延迟，模拟弱网。',
    category: '弱网',
    type: 'delay',
    seedConfig: { delayMs: 1200, varianceMs: 120, delayType: 'beforeRequest' },
  },
  {
    id: 'asset-proxy-forward',
    name: '转发到测试环境',
    description: '将命中请求转发到目标域名/路径。',
    category: '转发',
    type: 'proxyForward',
    seedConfig: { targetScheme: 'https', targetAuthority: 'api.example.com', targetPath: '/v1' },
  },
]

const meta = {
  title: 'Rules/RulesAssetsDrawer',
  component: RulesAssetsDrawer,
  args: {
    open: true,
    activePrimaryTab: 'rules',
    rulesPane: 'list',
    assetsPane: 'list',
    rules: SAMPLE_RULES,
    assets: SAMPLE_ASSETS,
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof RulesAssetsDrawer>

export default meta

type Story = StoryObj<typeof meta>

function createHarness(
  defaultPrimary: 'rules' | 'assets',
  defaultRulesPane: 'list' | 'editor',
  defaultAssetsPane: 'list' | 'editor',
  seedDraft?: Partial<RuleDraft>,
) {
  return () => ({
    components: { RulesAssetsDrawer, Button },
    setup() {
      const open = ref(true)
      const activePrimaryTab = ref<'rules' | 'assets'>(defaultPrimary)
      const rulesPane = ref<'list' | 'editor'>(defaultRulesPane)
      const assetsPane = ref<'list' | 'editor'>(defaultAssetsPane)
      const rulesStore = useRulesStore()

      watch(rulesPane, (pane) => {
        rulesStore.rulesPane = pane
      }, { immediate: true })

      const rules = ref<RuleWorkbenchRuleItem[]>([...SAMPLE_RULES])
      const selectedRuleId = ref('rule-001')
      const ruleDraft = ref<RuleDraft>(createRuleDraft({
        name: 'Auth Header Rewrite',
        priority: 90,
        matchDsl: 'api.example.com AND -X POST',
        ...seedDraft,
      }))

      const assets = ref<ActionAssetTemplate[]>([...SAMPLE_ASSETS])
      const selectedAssetId = ref(assets.value[0]?.id ?? '')

      const dirty = ref(false)
      const loading = ref(false)
      const saving = ref(false)

      const validationErrors = computed(() => getRuleValidationErrors(ruleDraft.value))

      async function onRulesSave(_id: string) {
        saving.value = true
        await new Promise<void>(resolve => {
          window.setTimeout(resolve, 600)
        })
        saving.value = false
        dirty.value = false
      }

      function onRuleDraftUpdate(next: RuleDraft) {
        const prev = ruleDraft.value
        ruleDraft.value = next
        dirty.value = true
        const id = selectedRuleId.value
        if (!id || !prev) return
        rules.value = rules.value.map(rule => (
          rule.id === id ? { ...rule, name: next.name, enabled: next.enabled } : rule
        ))
      }

      function onToggleRuleEnabled(id: string, enabled: boolean) {
        rules.value = rules.value.map(rule => (
          rule.id === id ? { ...rule, enabled } : rule
        ))
      }

      function createAsset(asset: ActionAssetTemplate) {
        assets.value = [asset, ...assets.value]
      }
      function updateAsset(asset: ActionAssetTemplate) {
        assets.value = assets.value.map(a => (a.id === asset.id ? asset : a))
      }
      function removeAsset(id: string) {
        assets.value = assets.value.filter(a => a.id !== id)
        if (selectedAssetId.value === id) {
          selectedAssetId.value = assets.value[0]?.id ?? ''
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
        assets,
        selectedAssetId,
        dirty,
        loading,
        saving,
        validationErrors,
        onRulesSave,
        onRuleDraftUpdate,
        onToggleRuleEnabled,
        createAsset,
        updateAsset,
        removeAsset,
      }
    },
    template: `
      <div class="min-h-screen bg-muted/20 p-4">
        <div class="flex items-center gap-2">
          <Button variant="outline" @click="open = true">打开抽屉</Button>
          <span class="text-xs text-muted-foreground">
            Tab={{ activePrimaryTab }} rulesPane={{ rulesPane }} assetsPane={{ assetsPane }}
            validationErrors={{ validationErrors.length }}
          </span>
        </div>

        <RulesAssetsDrawer
          v-model:open="open"
          v-model:activePrimaryTab="activePrimaryTab"
          v-model:rulesPane="rulesPane"
          v-model:assetsPane="assetsPane"
          v-model:selectedRuleId="selectedRuleId"
          v-model:ruleDraft="ruleDraft"
          v-model:selectedAssetId="selectedAssetId"
          :rules="rules"
          :assets="assets"
          :dirty="dirty"
          :loading="loading"
          :saving="saving"
          @rules:toggle-enabled="onToggleRuleEnabled"
          @rules:update:draft="onRuleDraftUpdate"
          @assets:create="createAsset"
          @assets:update="updateAsset"
          @assets:remove="removeAsset"
        />
      </div>
    `,
  })
}

export const Rules_List: Story = {
  args: {},
  render: createHarness('rules', 'list', 'list'),
}

export const Rules_Editor: Story = {
  args: {},
  render: createHarness('rules', 'editor', 'list'),
}

export const Rules_Editor_InvalidMatchDsl: Story = {
  args: {},
  render: createHarness('rules', 'editor', 'list', { matchDsl: 'example.com AND (' }),
}

export const Assets_List: Story = {
  args: {},
  render: createHarness('assets', 'list', 'list'),
}

export const Assets_Editor: Story = {
  args: {},
  render: createHarness('assets', 'list', 'editor'),
}

export const NoHeavyTitles: Story = {
  args: {},
  render: createHarness('rules', 'editor', 'list'),
}
