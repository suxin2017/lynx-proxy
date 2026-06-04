<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import type { ActionAssetTemplate } from '@/components/ui/rules-drawer/types'

const props = defineProps<{
  open: boolean
  draft?: ActionAssetTemplate | null
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  save: [asset: ActionAssetTemplate]
}>()

const form = ref<ActionAssetTemplate | null>(null)

watch(() => props.open, (open) => {
  if (!open) return
  if (props.draft) {
    form.value = { ...props.draft }
  }
})

watch(() => props.draft, (next) => {
  if (props.open && next) {
    form.value = { ...next }
  }
})

const canSave = computed(() => Boolean(form.value?.name.trim()))

function close() {
  emit('update:open', false)
}

function confirmSave() {
  if (!form.value || !canSave.value) return
  emit('save', form.value)
  close()
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.open"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      @click.self="close"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="保存为动作资产"
        class="flex w-full max-w-md flex-col overflow-hidden rounded-lg bg-card shadow-xl ring-1 ring-border/60"
      >
        <header class="border-b border-border px-3 py-2.5">
          <h2 class="text-sm font-semibold text-foreground">
            保存为动作资产
          </h2>
        </header>

        <div v-if="form" class="space-y-2 overflow-auto p-3">
          <label class="grid gap-1 text-[11px] text-muted-foreground">
            名称
            <input
              v-model="form.name"
              class="h-7 rounded-sm border border-input bg-background px-2 text-xs text-foreground outline-none ring-ring focus:ring-1"
            >
          </label>
          <label class="grid gap-1 text-[11px] text-muted-foreground">
            分类
            <input
              v-model="form.category"
              class="h-7 rounded-sm border border-input bg-background px-2 text-xs text-foreground outline-none ring-ring focus:ring-1"
            >
          </label>
          <p class="text-[10px] text-muted-foreground">
            类型：{{ form.type }}
          </p>
        </div>

        <footer class="flex justify-end gap-2 border-t border-border px-3 py-2.5">
          <Button variant="ghost" size="sm" class="h-8 px-2.5 text-xs" @click="close">
            取消
          </Button>
          <Button
            size="sm"
            class="h-8 px-3 text-xs"
            :disabled="!canSave"
            @click="confirmSave"
          >
            保存资产
          </Button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>
