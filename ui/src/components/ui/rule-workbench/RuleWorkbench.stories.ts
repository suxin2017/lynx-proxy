import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import RuleWorkbench, { type RuleWorkbenchRuleItem, type RuleEditorMode, type RuleMobilePane } from './RuleWorkbench.vue'
import { createRuleDraft } from './types'

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
  title: 'Workbench/RuleWorkbench',
  component: RuleWorkbench,
  args: {
    rules: SAMPLE_RULES,
    selectedRuleId: 'rule-001',
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof RuleWorkbench>

export default meta

type Story = StoryObj<typeof meta>

function createInteractiveRender(defaultMode: RuleEditorMode = 'visual', defaultPane: RuleMobilePane = 'editor') {
  return () => ({
    components: { RuleWorkbench },
    setup() {
      const selectedRuleId = ref('rule-001')
      const editorMode = ref<RuleEditorMode>(defaultMode)
      const mobilePane = ref<RuleMobilePane>(defaultPane)
      const saveRuns = ref(0)
      const draft = ref(createRuleDraft({
        name: 'Auth Header Rewrite',
        priority: 90,
      }))

      function onSave() {
        saveRuns.value += 1
      }

      return {
        selectedRuleId,
        editorMode,
        mobilePane,
        saveRuns,
        rules: SAMPLE_RULES,
        draft,
        onSave,
      }
    },
    template: `
      <div class="min-h-screen bg-muted/20 p-4">
        <RuleWorkbench
          v-model:selected-rule-id="selectedRuleId"
          v-model:editor-mode="editorMode"
          v-model:mobile-pane="mobilePane"
          v-model:draft="draft"
          :rules="rules"
          class="h-[calc(100vh-2rem)]"
          @save="onSave"
        />
        <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span class="rounded-sm border border-border bg-card px-2 py-1">Save runs: {{ saveRuns }}</span>
          <span class="rounded-sm border border-border bg-card px-2 py-1">Mode: {{ editorMode }}</span>
        </div>
      </div>
    `,
  })
}

export const Default: Story = {
  render: createInteractiveRender(),
}

export const DirtyState: Story = {
  args: {
    dirty: true,
    valid: true,
    selectedRuleId: 'rule-002',
  },
  render: createInteractiveRender(),
}

export const InvalidState: Story = {
  args: {
    dirty: true,
    valid: false,
    invalid: true,
    selectedRuleId: 'rule-003',
  },
  render: createInteractiveRender('dsl'),
}

export const LoadingState: Story = {
  args: {
    loading: true,
  },
  render: createInteractiveRender(),
}

export const MobileListPane: Story = {
  args: {
    mobilePane: 'list',
  },
  render: createInteractiveRender('visual', 'list'),
  parameters: {
    viewport: {
      defaultViewport: 'mobile2',
    },
  },
}
