<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { ListFilter } from '@lucide/vue'
import { drawerSearchInputClass } from '@/components/ui/rules-drawer/drawer-styles'
import type { ActionAssetTemplate } from '@/components/ui/rules-drawer/types'

const props = defineProps<{
  open: boolean
  assets?: ActionAssetTemplate[]
  anchorEl?: HTMLElement | null
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  pick: [asset: ActionAssetTemplate]
}>()

const searchTerm = ref('')
const panelRef = ref<HTMLElement | null>(null)
const position = ref({ top: 0, left: 0, width: 288, maxHeight: 288 })

const filteredAssets = computed(() => {
  const keyword = searchTerm.value.trim().toLowerCase()
  const list = props.assets ?? []
  if (!keyword) return list
  return list.filter(asset => (
    asset.name.toLowerCase().includes(keyword)
    || asset.category.toLowerCase().includes(keyword)
    || asset.type.toLowerCase().includes(keyword)
  ))
})

function close() {
  emit('update:open', false)
}

function pickAsset(asset: ActionAssetTemplate) {
  emit('pick', asset)
  close()
}

function updatePosition() {
  const anchor = props.anchorEl
  if (!anchor) return

  const rect = anchor.getBoundingClientRect()
  const width = Math.min(288, window.innerWidth - 16)
  const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))
  const top = rect.bottom + 6
  const maxHeight = Math.min(288, window.innerHeight - top - 12)

  position.value = { top, left, width, maxHeight }
}

watch(() => props.open, async (open) => {
  if (!open) {
    searchTerm.value = ''
    return
  }
  await nextTick()
  updatePosition()
})

watch(() => props.anchorEl, () => {
  if (props.open) updatePosition()
})

function onWindowChange() {
  if (props.open) updatePosition()
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', onWindowChange)
  window.addEventListener('scroll', onWindowChange, true)
}

onUnmounted(() => {
  window.removeEventListener('resize', onWindowChange)
  window.removeEventListener('scroll', onWindowChange, true)
  window.removeEventListener('keydown', onKeydown)
})

onClickOutside(panelRef, (event) => {
  if (!props.open) return
  const target = event.target as Node
  if (props.anchorEl?.contains(target)) return
  close()
})

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.open) close()
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', onKeydown)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.open"
      ref="panelRef"
      role="listbox"
      aria-label="选择动作资产"
      class="fixed z-[60] flex flex-col overflow-hidden rounded-md border border-border bg-card shadow-lg"
      :style="{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`,
        maxHeight: `${position.maxHeight}px`,
      }"
    >
      <div class="relative border-b border-border px-2 py-2">
        <ListFilter class="pointer-events-none absolute left-4 top-3.5 h-3.5 w-3.5 text-muted-foreground" />
        <input
          v-model="searchTerm"
          type="text"
          inputmode="search"
          :class="[drawerSearchInputClass, 'pl-7 pr-2']"
          placeholder="搜索资产"
          @keydown.esc.stop="close"
        >
      </div>

      <ul class="min-h-0 flex-1 overflow-auto p-1.5">
        <li
          v-if="filteredAssets.length === 0"
          class="rounded-sm border border-dashed border-border/70 p-2.5 text-xs text-muted-foreground"
        >
          {{ (props.assets ?? []).length === 0 ? '暂无动作资产' : '没有匹配的资产' }}
        </li>
        <li v-for="asset in filteredAssets" :key="asset.id" class="mb-0.5 last:mb-0">
          <button
            type="button"
            role="option"
            class="w-full rounded-md border border-transparent bg-muted/25 px-2 py-1.5 text-left transition-colors hover:border-border/60 hover:bg-muted/45"
            @click="pickAsset(asset)"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="truncate text-xs font-semibold text-foreground">{{ asset.name }}</p>
              <span class="shrink-0 text-[10px] text-muted-foreground">{{ asset.type }}</span>
            </div>
            <p class="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
              {{ asset.category }}
            </p>
          </button>
        </li>
      </ul>
    </div>
  </Teleport>
</template>
