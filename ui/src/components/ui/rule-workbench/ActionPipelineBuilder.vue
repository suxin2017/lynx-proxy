<script setup lang="ts">
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import ActionConfigRenderer from './ActionConfigRenderer.vue'
import { changeActionType, createAction, getActionSummary, getActionValidationErrors } from './types'
import type { RuleActionDraft, RuleHandlerType } from './types'

interface ActionPipelineBuilderProps {
  modelValue: RuleActionDraft[]
}

const props = defineProps<ActionPipelineBuilderProps>()
const emit = defineEmits<{
  'update:modelValue': [next: RuleActionDraft[]]
}>()

const handlerTypes: RuleHandlerType[] = [
  'modifyRequest',
  'modifyResponse',
  'block',
  'localFile',
  'proxyForward',
  'delay',
  'htmlScriptInjector',
]

function normalizeOrder(actions: RuleActionDraft[]): RuleActionDraft[] {
  return actions.map((action, idx) => ({
    ...action,
    order: idx + 1,
  }))
}

function updateAction(id: string, updater: (action: RuleActionDraft) => RuleActionDraft) {
  emit('update:modelValue', normalizeOrder(
    props.modelValue.map(action => (
      action.id === id ? updater(action) : action
    )),
  ))
}

function updateActionType(id: string, type: RuleHandlerType) {
  updateAction(id, draft => changeActionType(draft, type))
}

function moveAction(id: string, direction: -1 | 1) {
  const idx = props.modelValue.findIndex(action => action.id === id)
  const target = idx + direction
  if (idx < 0 || target < 0 || target >= props.modelValue.length) return

  const next = [...props.modelValue]
  const current = next[idx]
  next[idx] = next[target]
  next[target] = current
  emit('update:modelValue', normalizeOrder(next))
}

function addAction() {
  emit('update:modelValue', normalizeOrder([
    ...props.modelValue,
    createAction({
      order: props.modelValue.length + 1,
      name: `Handler ${props.modelValue.length + 1}`,
      type: 'modifyRequest',
    }),
  ]))
}

function removeAction(id: string) {
  if (props.modelValue.length <= 1) return
  emit('update:modelValue', normalizeOrder(props.modelValue.filter(action => action.id !== id)))
}

function validationErrors(action: RuleActionDraft): string[] {
  return getActionValidationErrors(action)
}
</script>

<template>
  <article class="rounded-lg bg-muted/25 p-3.5">
    <header class="sticky top-0 z-10 -mx-3.5 -mt-3.5 mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/40 bg-card/90 px-3.5 py-2.5 backdrop-blur-sm">
      <h3 class="flex items-center gap-2 text-xs font-semibold text-foreground">
        <GripVertical class="h-3.5 w-3.5 text-primary" />
        动作流水线
      </h3>
      <Button variant="outline" size="default" class="px-2.5" @click="addAction">
        <Plus class="h-3.5 w-3.5" />
        添加 Handler
      </Button>
    </header>

    <p class="mb-3 text-xs text-muted-foreground">
      配置执行顺序并汇总每个 Handler 的行为。
    </p>

    <ul class="space-y-2.5">
      <li
        v-for="(action, idx) in props.modelValue"
        :key="action.id"
        class="rounded-md bg-background/95 p-2.5 shadow-sm ring-1 ring-border/30"
      >
        <div class="mb-2 flex items-center justify-between gap-2">
          <div class="min-w-0">
            <p class="truncate text-xs font-semibold text-foreground">
              {{ action.name || `Handler ${idx + 1}` }}
            </p>
            <p v-if="validationErrors(action).length > 0" class="text-[11px] text-destructive">
              {{ validationErrors(action).length }} 个校验问题
            </p>
          </div>
          <div class="inline-flex items-center gap-1">
            <Button size="icon-sm" class="h-7 w-7" variant="ghost" :disabled="idx === 0" @click="moveAction(action.id, -1)">
              <ArrowUp class="h-3.5 w-3.5" />
            </Button>
            <Button size="icon-sm" class="h-7 w-7" variant="ghost" :disabled="idx === props.modelValue.length - 1" @click="moveAction(action.id, 1)">
              <ArrowDown class="h-3.5 w-3.5" />
            </Button>
            <Button size="icon-sm" class="h-7 w-7" variant="ghost" :disabled="props.modelValue.length <= 1" @click="removeAction(action.id)">
              <Trash2 class="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div class="grid gap-2 sm:grid-cols-2">
          <label class="grid gap-1 text-[11px] text-muted-foreground">
            类型
            <select
              class="h-7 rounded-sm border border-input bg-background px-2 text-xs text-foreground outline-none ring-ring focus:ring-1"
              :value="action.type"
              @change="updateActionType(action.id, ($event.target as HTMLSelectElement).value as RuleHandlerType)"
            >
              <option v-for="handlerType in handlerTypes" :key="handlerType" :value="handlerType">
                {{ handlerType }}
              </option>
            </select>
          </label>

          <label class="grid gap-1 text-[11px] text-muted-foreground">
            启用
            <select
              class="h-7 rounded-sm border border-input bg-background px-2 text-xs text-foreground outline-none ring-ring focus:ring-1"
              :value="action.enabled ? 'true' : 'false'"
              @change="updateAction(action.id, draft => ({ ...draft, enabled: ($event.target as HTMLSelectElement).value === 'true' }))"
            >
              <option value="true">已启用</option>
              <option value="false">已禁用</option>
            </select>
          </label>

          <label class="grid gap-1 text-[11px] text-muted-foreground sm:col-span-2">
            名称
            <input
              class="h-7 rounded-sm border border-input bg-background px-2 text-xs text-foreground outline-none ring-ring placeholder:text-muted-foreground focus:ring-1"
              :value="action.name"
              @input="updateAction(action.id, draft => ({ ...draft, name: ($event.target as HTMLInputElement).value }))"
            >
          </label>

          <label class="grid gap-1 text-[11px] text-muted-foreground sm:col-span-2">
            描述
            <textarea
              rows="2"
              class="rounded-sm border border-input bg-background px-2 py-1.5 text-xs text-foreground outline-none ring-ring placeholder:text-muted-foreground focus:ring-1"
              :value="action.description"
              @input="updateAction(action.id, draft => ({ ...draft, description: ($event.target as HTMLTextAreaElement).value }))"
            />
          </label>

          <div class="sm:col-span-2">
            <ActionConfigRenderer
              :action="action"
              @update:action="next => updateAction(action.id, () => next)"
            />
          </div>
        </div>

        <div class="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span>执行顺序：{{ action.order }}</span>
          <span class="truncate" :class="validationErrors(action).length > 0 ? 'text-destructive' : ''">{{ getActionSummary(action) }}</span>
        </div>
      </li>
    </ul>
  </article>
</template>
