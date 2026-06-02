<script setup lang="ts">
import { ref } from 'vue'
import { ArrowDown, ArrowUp, BookmarkPlus, GripVertical, Library, Plus, Trash2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { actionFromAssetTemplate, assetTemplateFromAction } from '@/components/ui/rules-drawer/action-asset-bridge'
import type { ActionAssetTemplate } from '@/components/ui/rules-drawer/types'
import ActionAssetDialog from './ActionAssetDialog.vue'
import ActionAssetPickerPopover from './ActionAssetPickerPopover.vue'
import ActionHandlerEditor from './ActionHandlerEditor.vue'
import { createAction, getActionSummary, getActionValidationErrors } from './types'
import type { RuleActionDraft } from './types'

interface ActionPipelineBuilderProps {
  modelValue: RuleActionDraft[]
  assets?: ActionAssetTemplate[]
}

const props = withDefaults(defineProps<ActionPipelineBuilderProps>(), {
  assets: () => [],
})

const emit = defineEmits<{
  'update:modelValue': [next: RuleActionDraft[]]
  'save-as-asset': [asset: ActionAssetTemplate]
}>()

const pickerOpen = ref(false)
const pickerAnchorRef = ref<HTMLElement | null>(null)
const saveDialogOpen = ref(false)
const saveDraft = ref<ActionAssetTemplate | null>(null)

function togglePicker() {
  pickerOpen.value = !pickerOpen.value
}

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
      type: 'modifyRequest',
    }),
  ]))
}

function actionTitle(action: RuleActionDraft, idx: number): string {
  return `${action.type} #${idx + 1}`
}

function addFromAsset(asset: ActionAssetTemplate) {
  emit('update:modelValue', normalizeOrder([
    ...props.modelValue,
    actionFromAssetTemplate(asset, props.modelValue.length + 1),
  ]))
}

function openSaveAsAsset(action: RuleActionDraft) {
  saveDraft.value = assetTemplateFromAction(action)
  saveDialogOpen.value = true
}

function confirmSaveAsAsset(asset: ActionAssetTemplate) {
  emit('save-as-asset', asset)
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
  <article class="min-w-0 rounded-lg bg-muted/25 p-3.5">
    <header class="sticky top-0 z-10 -mx-3.5 -mt-3.5 mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/40 bg-card/90 px-3.5 py-2.5 backdrop-blur-sm">
      <h3 class="flex items-center gap-2 text-xs font-semibold text-foreground">
        <GripVertical class="h-3.5 w-3.5 text-primary" />
        动作流水线
      </h3>
      <div class="flex flex-wrap items-center gap-2">
        <div ref="pickerAnchorRef" class="inline-flex">
          <Button
            variant="outline"
            size="default"
            class="px-2.5"
            :disabled="props.assets.length === 0"
            :aria-expanded="pickerOpen"
            aria-haspopup="listbox"
            @click="togglePicker"
          >
            <Library class="h-3.5 w-3.5" />
            从资产添加
          </Button>
          <ActionAssetPickerPopover
            v-model:open="pickerOpen"
            :anchor-el="pickerAnchorRef"
            :assets="props.assets"
            @pick="addFromAsset"
          />
        </div>
        <Button variant="outline" size="default" class="px-2.5" @click="addAction">
          <Plus class="h-3.5 w-3.5" />
          添加 Handler
        </Button>
      </div>
    </header>

    <p class="mb-3 text-xs text-muted-foreground">
      配置执行顺序并汇总每个 Handler 的行为。
    </p>

    <ul class="space-y-2.5">
      <li
        v-for="(action, idx) in props.modelValue"
        :key="action.id"
        class="min-w-0 rounded-md bg-background/95 p-2.5 shadow-sm ring-1 ring-border/30"
      >
        <div class="mb-2 flex items-center justify-between gap-2">
          <div class="min-w-0">
            <p class="truncate text-xs font-semibold text-foreground">
              {{ actionTitle(action, idx) }}
            </p>
            <p v-if="validationErrors(action).length > 0" class="text-[11px] text-destructive">
              {{ validationErrors(action).length }} 个校验问题
            </p>
          </div>
          <div class="inline-flex items-center gap-1">
            <Button
              size="icon-sm"
              class="h-7 w-7"
              variant="ghost"
              title="存为动作资产"
              @click="openSaveAsAsset(action)"
            >
              <BookmarkPlus class="h-3.5 w-3.5" />
            </Button>
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

        <ActionHandlerEditor
          :model-value="action"
          @update:model-value="next => updateAction(action.id, () => next)"
        />

        <div class="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span>执行顺序：{{ action.order }}</span>
          <span class="truncate" :class="validationErrors(action).length > 0 ? 'text-destructive' : ''">{{ getActionSummary(action) }}</span>
        </div>
      </li>
    </ul>

    <ActionAssetDialog
      v-model:open="saveDialogOpen"
      :draft="saveDraft"
      @save="confirmSaveAsAsset"
    />
  </article>
</template>
