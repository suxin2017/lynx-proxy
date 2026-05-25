<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed, ref, watch } from 'vue'
import { CheckCircle2, CircleDashed, FileJson2, ListFilter, Split, TriangleAlert } from '@lucide/vue'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { JsonEditor } from '@/components/ui/json-editor'
import MatchConditionBuilder from './MatchConditionBuilder.vue'
import ActionPipelineBuilder from './ActionPipelineBuilder.vue'
import { createRuleDraft } from './types'
import type { RuleDraft } from './types'

export type RuleEditorMode = 'visual' | 'dsl'
export type RuleMobilePane = 'list' | 'editor'

export interface RuleWorkbenchRuleItem {
  id: string
  name: string
  enabled: boolean
  priority: number
  summary?: string
  state?: 'draft' | 'valid' | 'invalid'
}

interface RuleWorkbenchProps {
  rules: RuleWorkbenchRuleItem[]
  draft?: RuleDraft
  selectedRuleId?: string
  editorMode?: RuleEditorMode
  mobilePane?: RuleMobilePane
  loading?: boolean
  dirty?: boolean
  valid?: boolean
  invalid?: boolean
  saving?: boolean
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<RuleWorkbenchProps>(), {
  selectedRuleId: '',
  editorMode: 'visual',
  mobilePane: 'editor',
  loading: false,
  dirty: false,
  valid: true,
  invalid: false,
  saving: false,
})

const emit = defineEmits<{
  'update:draft': [draft: RuleDraft]
  'update:selectedRuleId': [id: string]
  'update:editorMode': [mode: RuleEditorMode]
  'update:mobilePane': [pane: RuleMobilePane]
  'save': [id: string]
}>()

const searchTerm = ref('')

const selectedRuleIdLocal = ref(props.selectedRuleId)
const editorModeLocal = ref<RuleEditorMode>(props.editorMode)
const mobilePaneLocal = ref<RuleMobilePane>(props.mobilePane)
const draftLocal = ref<RuleDraft>(props.draft ?? createRuleDraft())
const dslText = ref(JSON.stringify(draftLocal.value, null, 2))

let syncingFromDsl = false
let syncingFromDraft = false

watch(() => props.selectedRuleId, next => {
  selectedRuleIdLocal.value = next
})

watch(() => props.editorMode, next => {
  editorModeLocal.value = next
})

watch(() => props.mobilePane, next => {
  mobilePaneLocal.value = next
})

watch(() => props.draft, next => {
  if (!next) return
  draftLocal.value = next
})

watch(draftLocal, (next) => {
  emit('update:draft', next)
  if (syncingFromDsl) return
  syncingFromDraft = true
  dslText.value = JSON.stringify(next, null, 2)
  syncingFromDraft = false
}, { deep: true })

watch(dslText, (next) => {
  if (syncingFromDraft) return
  try {
    const parsed = JSON.parse(next) as RuleDraft
    syncingFromDsl = true
    draftLocal.value = {
      ...createRuleDraft(),
      ...parsed,
      match: {
        ...createRuleDraft().match,
        ...(parsed.match ?? {}),
      },
      actions: Array.isArray(parsed.actions) && parsed.actions.length > 0
        ? parsed.actions
        : createRuleDraft().actions,
    }
  }
  catch {
    // Keep existing draft until JSON becomes valid.
  }
  finally {
    syncingFromDsl = false
  }
})

const filteredRules = computed(() => {
  const keyword = searchTerm.value.trim().toLowerCase()
  if (!keyword) return props.rules
  return props.rules.filter(rule => {
    return (
      rule.name.toLowerCase().includes(keyword)
      || (rule.summary ?? '').toLowerCase().includes(keyword)
      || String(rule.priority).includes(keyword)
    )
  })
})

const selectedRule = computed(() => {
  return props.rules.find(rule => rule.id === selectedRuleIdLocal.value) ?? filteredRules.value[0]
})

const isSaveDisabled = computed(() => {
  return props.loading || props.saving || props.invalid || !selectedRule.value
})

const statusLabel = computed(() => {
  if (props.loading) return '正在加载草稿'
  if (props.invalid) return '无效'
  if (!props.dirty) return '已保存'
  if (props.valid) return '可保存'
  return '草稿有变更'
})

function ruleStateLabel(state?: RuleWorkbenchRuleItem['state']) {
  if (state === 'invalid') return '无效'
  if (state === 'valid') return '有效'
  return '草稿'
}

function updateSelectedRule(id: string) {
  selectedRuleIdLocal.value = id
  emit('update:selectedRuleId', id)
}

function updateEditorMode(mode: RuleEditorMode) {
  editorModeLocal.value = mode
  emit('update:editorMode', mode)
}

function updateMobilePane(pane: RuleMobilePane) {
  mobilePaneLocal.value = pane
  emit('update:mobilePane', pane)
}

function requestSave() {
  if (!selectedRule.value) return
  emit('save', selectedRule.value.id)
}

function updateMatch(next: RuleDraft['match']) {
  draftLocal.value = {
    ...draftLocal.value,
    match: next,
  }
}

function updateActions(next: RuleDraft['actions']) {
  draftLocal.value = {
    ...draftLocal.value,
    actions: next,
  }
}

function ruleStateClass(state?: RuleWorkbenchRuleItem['state']) {
  if (state === 'invalid') return 'text-destructive'
  if (state === 'valid') return 'text-emerald-600'
  return 'text-muted-foreground'
}
</script>

<template>
  <section
    :class="cn(
      'flex min-h-[520px] w-full flex-col overflow-hidden rounded-lg border border-border bg-background',
      props.class,
    )"
  >
    <header class="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2.5">
      <div class="space-y-0.5">
        <p class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          规则工作台
        </p>
        <p class="text-xs text-muted-foreground">
          匹配目标 + 动作流水线 + 预览
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <span
          class="inline-flex items-center gap-1 rounded-sm border border-border bg-card px-2 py-1 text-[11px] font-medium"
          :class="props.invalid ? 'text-destructive' : 'text-foreground'"
        >
          <TriangleAlert v-if="props.invalid" class="h-3.5 w-3.5" />
          <CheckCircle2 v-else-if="!props.dirty" class="h-3.5 w-3.5 text-emerald-600" />
          <CircleDashed v-else class="h-3.5 w-3.5" />
          {{ statusLabel }}
        </span>

        <Button size="default" class="px-3" :disabled="isSaveDisabled" @click="requestSave">
          {{ props.saving ? '保存中...' : '保存规则' }}
        </Button>
      </div>
    </header>

    <div class="bg-muted/20 px-2 pt-2 md:hidden">
      <div role="tablist" aria-label="移动端面板" class="flex border-b border-border/50">
        <button
          type="button"
          role="tab"
          aria-controls="rule-pane-list"
          :aria-selected="mobilePaneLocal === 'list'"
          class="-mb-px h-8 flex-1 border-b-2 px-2 text-xs font-medium transition-colors"
          :class="mobilePaneLocal === 'list'
            ? 'border-primary text-foreground'
            : 'border-transparent text-muted-foreground hover:text-foreground'"
          @click="updateMobilePane('list')"
        >
          列表
        </button>
        <button
          type="button"
          role="tab"
          aria-controls="rule-pane-editor"
          :aria-selected="mobilePaneLocal === 'editor'"
          class="-mb-px h-8 flex-1 border-b-2 px-2 text-xs font-medium transition-colors"
          :class="mobilePaneLocal === 'editor'
            ? 'border-primary text-foreground'
            : 'border-transparent text-muted-foreground hover:text-foreground'"
          @click="updateMobilePane('editor')"
        >
          编辑
        </button>
      </div>
    </div>

    <div class="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)]">
      <aside
        id="rule-pane-list"
        class="flex min-h-0 flex-col bg-muted/20 md:border-r md:border-border/55"
        :class="mobilePaneLocal !== 'list' ? 'hidden md:flex' : 'flex'"
      >
        <div class="px-3 py-2">
          <label class="sr-only" for="rule-workbench-search">搜索规则</label>
          <div class="relative">
            <ListFilter class="pointer-events-none absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              id="rule-workbench-search"
              v-model="searchTerm"
              type="search"
              class="h-7 w-full rounded-sm border border-input bg-background pl-7 pr-2 text-xs text-foreground outline-none ring-ring transition-colors placeholder:text-muted-foreground focus:ring-1"
              placeholder="搜索规则"
            >
          </div>
        </div>

        <ul class="flex-1 space-y-1 overflow-auto p-2">
          <li v-if="filteredRules.length === 0" class="rounded-sm border border-dashed border-border p-3 text-xs text-muted-foreground">
            没有匹配当前筛选条件的规则。
          </li>
          <li v-for="rule in filteredRules" :key="rule.id">
            <button
              type="button"
              class="w-full rounded-md px-2.5 py-2 text-left transition-colors"
              :class="rule.id === selectedRule?.id
                ? 'bg-primary/10 shadow-sm ring-1 ring-primary/35'
                : 'bg-background/80 hover:bg-accent/50'"
              @click="updateSelectedRule(rule.id)"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="truncate text-xs font-semibold text-foreground">{{ rule.name }}</p>
                <span class="text-[10px] font-medium" :class="ruleStateClass(rule.state)">
                  {{ ruleStateLabel(rule.state) }}
                </span>
              </div>
              <p class="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                {{ rule.summary || '暂无摘要。' }}
              </p>
              <div class="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>优先级 {{ rule.priority }}</span>
                <span>{{ rule.enabled ? '已启用' : '已禁用' }}</span>
              </div>
            </button>
          </li>
        </ul>
      </aside>

      <main
        id="rule-pane-editor"
        class="min-h-0 bg-muted/10"
        :class="mobilePaneLocal !== 'editor' ? 'hidden md:block' : 'block'"
      >
        <div class="flex h-full min-h-0 flex-col">
          <div class="flex items-center justify-between border-b border-border px-3 py-2.5">
            <div>
              <p class="text-xs font-semibold text-foreground">
                {{ selectedRule?.name || '未选择规则' }}
              </p>
              <p class="text-[11px] text-muted-foreground">
                编排捕获条件与动作流水线。
              </p>
            </div>

            <div role="tablist" aria-label="编辑模式" class="flex border-b border-border/50">
              <button
                type="button"
                role="tab"
                aria-controls="editor-mode-visual"
                :aria-selected="editorModeLocal === 'visual'"
                class="-mb-px inline-flex h-8 items-center gap-1.5 border-b-2 px-2.5 text-xs font-medium transition-colors"
                :class="editorModeLocal === 'visual'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'"
                @click="updateEditorMode('visual')"
              >
                <Split class="h-3.5 w-3.5" />
                可视化
              </button>
              <button
                type="button"
                role="tab"
                aria-controls="editor-mode-dsl"
                :aria-selected="editorModeLocal === 'dsl'"
                class="-mb-px inline-flex h-8 items-center gap-1.5 border-b-2 px-2.5 text-xs font-medium transition-colors"
                :class="editorModeLocal === 'dsl'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'"
                @click="updateEditorMode('dsl')"
              >
                <FileJson2 class="h-3.5 w-3.5" />
                DSL
              </button>
            </div>
          </div>

          <div id="editor-mode-visual" class="grid min-h-0 flex-1 gap-3 overflow-auto p-3" v-if="editorModeLocal === 'visual'">
            <slot
              name="editor"
              :rule="selectedRule"
              :mode="editorModeLocal"
              :draft="draftLocal"
            >
              <MatchConditionBuilder
                :model-value="draftLocal.match"
                @update:model-value="updateMatch"
              />

              <ActionPipelineBuilder
                :model-value="draftLocal.actions"
                @update:model-value="updateActions"
              />
            </slot>
          </div>

          <div id="editor-mode-dsl" class="grid min-h-0 flex-1 gap-3 overflow-auto p-3" v-else>
            <slot
              name="editor"
              :rule="selectedRule"
              :mode="editorModeLocal"
              :draft="draftLocal"
            >
              <article class="space-y-2">
                <header class="mb-2 flex items-center justify-between">
                  <h3 class="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <FileJson2 class="h-3.5 w-3.5 text-primary" />
                    DSL 编辑器
                  </h3>
                  <span class="text-[10px] uppercase tracking-wide text-muted-foreground">
                    JSON 草稿
                  </span>
                </header>

                <JsonEditor
                  v-model="dslText"
                  title="规则草稿"
                  class="min-h-[360px]"
                />
              </article>
            </slot>
          </div>
        </div>
      </main>
    </div>
  </section>
</template>
