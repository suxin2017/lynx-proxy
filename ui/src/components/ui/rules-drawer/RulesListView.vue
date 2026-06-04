<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed, ref, watch } from 'vue'
import Draggable from 'vuedraggable'
import { GripVertical, ListFilter, Plus } from '@lucide/vue'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import type { RuleWorkbenchRuleItem } from '@/components/ui/rule-workbench'
import { drawerEmptyStateClass, drawerListItemClass, drawerSearchInputClass } from './drawer-styles'

const props = withDefaults(defineProps<{
  rules: RuleWorkbenchRuleItem[]
  selectedRuleId?: string
  reordering?: boolean
  class?: HTMLAttributes['class']
}>(), {
  selectedRuleId: '',
  reordering: false,
})

const emit = defineEmits<{
  create: []
  edit: [id: string]
  duplicate: [id: string]
  delete: [id: string]
  select: [id: string]
  'toggle-enabled': [id: string, enabled: boolean]
  reorder: [orderedIds: string[]]
}>()

const searchTerm = ref('')
const localRules = ref<RuleWorkbenchRuleItem[]>([])

const filteredRules = computed(() => {
  const keyword = searchTerm.value.trim().toLowerCase()
  if (!keyword) return props.rules
  return props.rules.filter(rule => (
    rule.name.toLowerCase().includes(keyword)
    || (rule.summary ?? '').toLowerCase().includes(keyword)
  ))
})

watch(filteredRules, (next) => {
  // Keep a local mutable list for native drag-drop.
  localRules.value = [...next]
}, { immediate: true })

const dragDisabled = computed(() => props.reordering || searchTerm.value.trim().length > 0)

function onDragEnd() {
  if (dragDisabled.value) return
  const ordered = localRules.value.map(r => r.id)
  emit('reorder', ordered)
}

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
      <Draggable
        v-else
        v-model="localRules"
        item-key="id"
        :disabled="dragDisabled"
        handle=".drag-handle"
        :animation="180"
        ghost-class="rule-drag-ghost"
        chosen-class="rule-drag-chosen"
        drag-class="rule-drag-dragging"
        @end="onDragEnd"
      >
        <template #item="{ element: rule }">
          <li>
            <div
              :class="cn(
                drawerListItemClass(rule.id === props.selectedRuleId),
                !rule.enabled && 'opacity-70',
              )"
            >
              <div class="flex items-start gap-2">
                <button
                  type="button"
                  class="drag-handle mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
                  :class="dragDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-grab active:cursor-grabbing'"
                  :disabled="dragDisabled"
                  :aria-label="`拖拽排序 ${rule.name}`"
                  title="拖拽排序"
                >
                  <GripVertical class="h-4 w-4" />
                </button>

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
                </button>
              </div>

              <div class="mt-2 flex justify-end gap-1">
                <Button variant="ghost" size="sm" class="h-7 px-2 text-xs" @click="emit('edit', rule.id)">
                  编辑
                </Button>
                <Button variant="ghost" size="sm" class="h-7 px-2 text-xs" @click="emit('duplicate', rule.id)">
                  复制
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  class="h-7 px-2 text-xs text-destructive hover:text-destructive"
                  :aria-label="`删除 ${rule.name}`"
                  @click="emit('delete', rule.id)"
                >
                  删除
                </Button>
              </div>
            </div>
          </li>
        </template>
      </Draggable>
    </ul>
  </section>
</template>

<style scoped>
.rule-drag-ghost {
  opacity: 0.45;
}

.rule-drag-chosen {
  opacity: 0.9;
}

.rule-drag-dragging {
  opacity: 0.85;
}
</style>

