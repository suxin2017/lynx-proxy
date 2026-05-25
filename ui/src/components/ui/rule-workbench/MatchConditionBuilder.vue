<script setup lang="ts">
import { Route, Trash2 } from '@lucide/vue'
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { createSimpleCondition } from './types'
import type { RuleCaptureType, RuleLogicalOperator, RuleMatchGroup, RuleMatchSimpleCondition } from './types'

interface MatchConditionBuilderProps {
  modelValue: RuleMatchGroup
}

const props = defineProps<MatchConditionBuilderProps>()
const emit = defineEmits<{
  'update:modelValue': [next: RuleMatchGroup]
}>()

const operatorOptions: RuleLogicalOperator[] = ['and', 'or', 'not']
const patternOptions: RuleCaptureType[] = ['contains', 'exact', 'glob', 'regex']
const methodOptions = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

const conditions = computed(() => props.modelValue.conditions)

function updateOperator(operator: RuleLogicalOperator) {
  emit('update:modelValue', {
    ...props.modelValue,
    operator,
  })
}

function updateCondition(id: string, updater: (condition: RuleMatchSimpleCondition) => RuleMatchSimpleCondition) {
  emit('update:modelValue', {
    ...props.modelValue,
    conditions: props.modelValue.conditions.map(condition => (
      condition.id === id ? updater(condition) : condition
    )),
  })
}

function addCondition() {
  emit('update:modelValue', {
    ...props.modelValue,
    conditions: [...props.modelValue.conditions, createSimpleCondition()],
  })
}

function removeCondition(id: string) {
  if (props.modelValue.conditions.length <= 1) return
  emit('update:modelValue', {
    ...props.modelValue,
    conditions: props.modelValue.conditions.filter(condition => condition.id !== id),
  })
}
</script>

<template>
  <article class="rounded-lg bg-muted/25 p-3.5">
    <header class="sticky top-0 z-10 -mx-3.5 -mt-3.5 mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/40 bg-card/90 px-3.5 py-2.5 backdrop-blur-sm">
      <div class="flex items-center gap-2">
        <h3 class="flex items-center gap-2 text-xs font-semibold text-foreground">
          <Route class="h-3.5 w-3.5 text-primary" />
          匹配目标
        </h3>
      </div>
      <div class="inline-flex items-center gap-1 rounded-md bg-background/85 p-1 ring-1 ring-border/45">
        <Button variant="outline" size="default" class="px-2.5" @click="addCondition">
          添加条件
        </Button>
        <span class="mx-0.5 h-5 w-px bg-border/60" aria-hidden="true" />
        <Button
          v-for="op in operatorOptions"
          :key="op"
          size="default"
          class="px-2.5"
          :variant="props.modelValue.operator === op ? 'default' : 'ghost'"
          @click="updateOperator(op)"
        >
          {{ op.toUpperCase() }}
        </Button>
      </div>
    </header>

    <p class="mb-3 text-xs text-muted-foreground">
      使用 method/host/pattern/header 约束编排请求捕获规则。
    </p>

    <ul class="space-y-2.5">
      <li v-for="(condition, idx) in conditions" :key="condition.id" class="rounded-md bg-background/95 p-2.5 shadow-sm ring-1 ring-border/30">
        <div class="mb-2 flex items-center justify-between gap-2">
          <span class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">条件 {{ idx + 1 }}</span>
          <Button
            size="icon-sm"
            class="h-7 w-7"
            variant="ghost"
            :disabled="conditions.length <= 1"
            @click="removeCondition(condition.id)"
          >
            <Trash2 class="h-3.5 w-3.5" />
          </Button>
        </div>

        <div class="grid gap-2 sm:grid-cols-2">
          <label class="grid gap-1 text-[11px] text-muted-foreground">
            方法
            <select
              class="h-7 rounded-sm border border-input bg-background px-2 text-xs text-foreground outline-none ring-ring focus:ring-1"
              :value="condition.method"
              @change="updateCondition(condition.id, draft => ({ ...draft, method: ($event.target as HTMLSelectElement).value }))"
            >
              <option v-for="method in methodOptions" :key="method" :value="method">
                {{ method }}
              </option>
            </select>
          </label>

          <label class="grid gap-1 text-[11px] text-muted-foreground">
            主机
            <input
              class="h-7 rounded-sm border border-input bg-background px-2 text-xs text-foreground outline-none ring-ring placeholder:text-muted-foreground focus:ring-1"
              :value="condition.host"
              placeholder="api.example.com"
              @input="updateCondition(condition.id, draft => ({ ...draft, host: ($event.target as HTMLInputElement).value }))"
            >
          </label>

          <label class="grid gap-1 text-[11px] text-muted-foreground">
            匹配类型
            <select
              class="h-7 rounded-sm border border-input bg-background px-2 text-xs text-foreground outline-none ring-ring focus:ring-1"
              :value="condition.patternType"
              @change="updateCondition(condition.id, draft => ({ ...draft, patternType: ($event.target as HTMLSelectElement).value as RuleCaptureType }))"
            >
              <option v-for="mode in patternOptions" :key="mode" :value="mode">
                {{ mode }}
              </option>
            </select>
          </label>

          <label class="grid gap-1 text-[11px] text-muted-foreground">
            URL 匹配模式
            <input
              class="h-7 rounded-sm border border-input bg-background px-2 text-xs text-foreground outline-none ring-ring placeholder:text-muted-foreground focus:ring-1"
              :value="condition.pattern"
              placeholder="/v1/payments/*"
              @input="updateCondition(condition.id, draft => ({ ...draft, pattern: ($event.target as HTMLInputElement).value }))"
            >
          </label>

          <label class="grid gap-1 text-[11px] text-muted-foreground">
            Header 名称
            <input
              class="h-7 rounded-sm border border-input bg-background px-2 text-xs text-foreground outline-none ring-ring placeholder:text-muted-foreground focus:ring-1"
              :value="condition.headerName"
              placeholder="x-env"
              @input="updateCondition(condition.id, draft => ({ ...draft, headerName: ($event.target as HTMLInputElement).value }))"
            >
          </label>

          <label class="grid gap-1 text-[11px] text-muted-foreground">
            Header 值
            <input
              class="h-7 rounded-sm border border-input bg-background px-2 text-xs text-foreground outline-none ring-ring placeholder:text-muted-foreground focus:ring-1"
              :value="condition.headerValue"
              placeholder="staging"
              @input="updateCondition(condition.id, draft => ({ ...draft, headerValue: ($event.target as HTMLInputElement).value }))"
            >
          </label>
        </div>
      </li>
    </ul>
  </article>
</template>
