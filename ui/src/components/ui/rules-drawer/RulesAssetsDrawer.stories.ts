import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { computed, ref, watch } from 'vue'
import { useRulesStore } from '@/stores/modules/rules.store'
import { Button } from '@/components/ui/button'
import type { RuleDraft, RuleWorkbenchRuleItem } from '@/components/ui/rule-workbench'
import { createRuleDraft, getRuleValidationErrors } from '@/components/ui/rule-workbench'
import RulesAssetsDrawer from './RulesAssetsDrawer.vue'

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

const meta = {
  title: 'Rules/RulesAssetsDrawer',
  component: RulesAssetsDrawer,
  args: {
    open: true,
    activePrimaryTab: 'rules',
    rulesPane: 'list',
    rules: SAMPLE_RULES,
    selectedRuleId: 'rule-001',
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof RulesAssetsDrawer>

export default meta

type Story = StoryObj<typeof meta>

function createHarness(
  defaultRulesPane: 'list' | 'editor',
  seedDraft?: Partial<RuleDraft>,
) {
  return () => ({
    components: { RulesAssetsDrawer, Button },
    setup() {
      const open = ref(true)
      const activePrimaryTab = ref<'rules'>('rules')
      const rulesPane = ref<'list' | 'editor'>(defaultRulesPane)
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

      const dirty = ref(false)
      const loading = ref(false)
      const saving = ref(false)

      const validationErrors = computed(() => getRuleValidationErrors(ruleDraft.value))

      watch(ruleDraft, (next) => {
        dirty.value = true
        const id = selectedRuleId.value
        if (!id) return
        rules.value = rules.value.map((rule: RuleWorkbenchRuleItem) => (
          rule.id === id ? { ...rule, name: next.name, enabled: next.enabled } : rule
        ))
      }, { deep: true })

      async function onRulesSave(_id: string) {
        saving.value = true
        await new Promise<void>(resolve => {
          window.setTimeout(resolve, 600)
        })
        saving.value = false
        dirty.value = false
      }

      function onToggleRuleEnabled(id: string, enabled: boolean) {
        rules.value = rules.value.map((rule: RuleWorkbenchRuleItem) => (
          rule.id === id ? { ...rule, enabled } : rule
        ))
      }

      return {
        open,
        activePrimaryTab,
        rulesPane,
        rules,
        selectedRuleId,
        ruleDraft,
        dirty,
        loading,
        saving,
        validationErrors,
        onRulesSave,
        onToggleRuleEnabled,
      }
    },
    template: `
      <div class="min-h-screen bg-muted/20 p-4">
        <div class="flex items-center gap-2">
          <Button variant="outline" @click="open = true">打开抽屉</Button>
          <span class="text-xs text-muted-foreground">
            rulesPane={{ rulesPane }} validationErrors={{ validationErrors.length }}
          </span>
        </div>

        <RulesAssetsDrawer
          v-model:open="open"
          v-model:activePrimaryTab="activePrimaryTab"
          v-model:rulesPane="rulesPane"
          v-model:selectedRuleId="selectedRuleId"
          v-model:ruleDraft="ruleDraft"
          :rules="rules"
          :dirty="dirty"
          :loading="loading"
          :saving="saving"
          @rules:toggle-enabled="onToggleRuleEnabled"
          @rules:save="onRulesSave"
        />
      </div>
    `,
  })
}

export const Rules_List: Story = {
  args: {},
  render: createHarness('list'),
}

export const Rules_Editor: Story = {
  args: {},
  render: createHarness('editor'),
}

export const Rules_Editor_InvalidMatchDsl: Story = {
  args: {},
  render: createHarness('editor', { matchDsl: 'example.com AND (' }),
}
