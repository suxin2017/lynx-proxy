<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed, ref } from 'vue'
import { ListFilter, Plus, Trash2 } from '@lucide/vue'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import type { RuleWorkbenchRuleItem } from '@/components/ui/rule-workbench'
import { drawerEmptyStateClass, drawerListItemClass, drawerSearchInputClass } from './drawer-styles'

const props = withDefaults(defineProps<{
  rules: RuleWorkbenchRuleItem[]
  selectedRuleId?: string
  class?: HTMLAttributes['class']
}>(), {
  selectedRuleId: '',
})

const emit = defineEmits<{
  create: []
  edit: [id: string]
  delete: [id: string]
  select: [id: string]
  'toggle-enabled': [id: string, enabled: boolean]
}>()

const searchTerm = ref('')

const filteredRules = computed(() => {
  const keyword = searchTerm.value.trim().toLowerCase()
  if (!keyword) return props.rules
  return props.rules.filter(rule => (
    rule.name.toLowerCase().includes(keyword)
    || (rule.summary ?? '').toLowerCase().includes(keyword)
    || String(rule.priority).includes(keyword)
  ))
})

function ruleStateLabel(state?: RuleWorkbenchRuleItem['state']) {
  if (state === 'invalid') return '无效'
  if (state === 'valid') return '有效'
  return '草稿'
}

function ruleStateClass(state?: RuleWorkbenchRuleItem['state']) {
  if (state === 'invalid') return 'text-destructive'
  if (state === 'valid') return 'text-emerald-600'
  return 'text-muted-foreground'
}
</script>

<template>
  <section :class="cn('flex h-full min-h-0 flex-col overflow-hidden', props.class)">
    <div class="flex items-center justify-between gap-2 px-2 pb-2">
      <div class="relative flex-1">
        <ListFilter class="pointer-events-none absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
        <input
          v-model="searchTerm"
          type="text"
          inputmode="search"
          :class="[drawerSearchInputClass, 'pl-7 pr-2']"
          placeholder="搜索规则"
        >
      </div>

      <Button variant="outline" size="default" class="px-2.5" @click="emit('create')">
        <Plus class="h-3.5 w-3.5" />
        新建
      </Button>
    </div>

    <ul class="flex-1 space-y-1 overflow-auto px-2 pb-2">
      <li v-if="filteredRules.length === 0" :class="drawerEmptyStateClass">
        没有匹配当前筛选条件的规则。
      </li>
      <li v-for="rule in filteredRules" :key="rule.id">
        <div
          :class="cn(
            drawerListItemClass(rule.id === props.selectedRuleId),
            !rule.enabled && 'opacity-70',
          )"
        >
          <div class="flex items-start gap-2">
            <div class="pt-0.5" @click.stop>
              <Switch
                :checked="rule.enabled"
                :aria-label="rule.enabled ? `禁用 ${rule.name}` : `启用 ${rule.name}`"
                @update:checked="emit('toggle-enabled', rule.id, $event)"
              />
            </div>

            <button type="button" class="min-w-0 flex-1 text-left" @click="emit('select', rule.id)">
              <div class="flex items-center justify-between gap-2">
                <p class="truncate text-xs font-semibold text-foreground">{{ rule.name }}</p>
                <span class="shrink-0 text-[10px] font-medium" :class="ruleStateClass(rule.state)">
                  {{ ruleStateLabel(rule.state) }}
                </span>
              </div>
              <p class="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                {{ rule.summary || '暂无摘要。' }}
              </p>
              <p class="mt-2 text-[10px] text-muted-foreground">
                优先级 {{ rule.priority }}
              </p>
            </button>
          </div>

          <div class="mt-2 flex justify-end gap-1">
            <Button variant="ghost" size="sm" class="h-7 px-2 text-xs" @click="emit('edit', rule.id)">
              编辑
            </Button>
            <Button
              variant="ghost"
              size="sm"
              class="h-7 px-2 text-xs text-destructive hover:text-destructive"
              :aria-label="`删除 ${rule.name}`"
              @click="emit('delete', rule.id)"
            >
              <Trash2 class="h-3.5 w-3.5" />
              删除
            </Button>
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>

