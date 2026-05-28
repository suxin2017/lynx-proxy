<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed, ref, watch } from 'vue'
import { Save, Trash2 } from '@lucide/vue'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import ActionHandlerEditor from '@/components/ui/rule-workbench/ActionHandlerEditor.vue'
import {
  actionDraftFromAssetTemplate,
  applyActionDraftToAssetTemplate,
} from './action-asset-bridge'
import type { ActionAssetTemplate } from './types'

const props = withDefaults(defineProps<{
  asset?: ActionAssetTemplate | null
  class?: HTMLAttributes['class']
}>(), {
  asset: null,
})

const emit = defineEmits<{
  create: [template: ActionAssetTemplate]
  update: [template: ActionAssetTemplate]
  remove: [id: string]
}>()

const draft = ref<ActionAssetTemplate | null>(null)

watch(() => props.asset, (next) => {
  if (next) {
    draft.value = { ...next }
    return
  }

  draft.value = {
    id: `asset-${Math.random().toString(36).slice(2, 9)}`,
    name: '未命名资产',
    description: '',
    category: '未分类',
    type: 'modifyRequest',
    seedConfig: { modifyHeaders: [], modifyMethod: '', modifyUrl: '', modifyBody: '' },
  }
}, { immediate: true })

const actionDraft = computed(() => {
  if (!draft.value) return null
  return actionDraftFromAssetTemplate(draft.value)
})

function onActionUpdate(next: ReturnType<typeof actionDraftFromAssetTemplate>) {
  if (!draft.value) return
  draft.value = applyActionDraftToAssetTemplate(draft.value, next)
}

function onCategoryUpdate(category: string) {
  if (!draft.value) return
  draft.value = { ...draft.value, category }
}

function save() {
  if (!draft.value) return
  const exists = Boolean(props.asset && props.asset.id === draft.value.id)
  if (exists) emit('update', draft.value)
  else emit('create', draft.value)
}

function remove() {
  if (!draft.value) return
  emit('remove', draft.value.id)
}
</script>

<template>
  <section :class="cn('flex h-full min-h-0 flex-col overflow-hidden', props.class)">
    <div class="flex items-center justify-end gap-2 border-b border-border px-2 py-2">
      <div class="flex items-center gap-2">
        <Button variant="outline" size="default" class="h-8 px-2.5 text-xs" :disabled="!draft || !props.asset" @click="remove">
          <Trash2 class="h-3.5 w-3.5" />
          删除
        </Button>
        <Button size="default" class="h-8 px-3 text-xs" :disabled="!draft" @click="save">
          <Save class="h-3.5 w-3.5" />
          保存
        </Button>
      </div>
    </div>

    <div v-if="!draft || !actionDraft" class="p-3 text-xs text-muted-foreground">
      未选择资产。
    </div>

    <div v-else class="min-h-0 flex-1 overflow-auto p-3">
      <div class="rounded-md bg-background/95 p-2.5 ring-1 ring-border/30">
        <ActionHandlerEditor
          :model-value="actionDraft"
          :show-enabled="false"
          show-category
          :category="draft.category"
          @update:model-value="onActionUpdate"
          @update:category="onCategoryUpdate"
        />
      </div>
    </div>
  </section>
</template>
