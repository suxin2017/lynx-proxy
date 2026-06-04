<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed, ref } from 'vue'
import { ListFilter, Plus } from '@lucide/vue'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { ActionAssetTemplate } from './types'
import {
  drawerEmptyStateClass,
  drawerFilterChipClass,
  drawerListItemClass,
  drawerSearchInputClass,
} from './drawer-styles'

const props = withDefaults(defineProps<{
  assets: ActionAssetTemplate[]
  selectedAssetId?: string
  class?: HTMLAttributes['class']
}>(), {
  selectedAssetId: '',
})

const emit = defineEmits<{
  create: []
  edit: [id: string]
  select: [id: string]
}>()

const searchTerm = ref('')
const activeCategory = ref<string>('全部')

const categories = computed(() => {
  const set = new Set<string>()
  props.assets.forEach(t => set.add(t.category))
  return ['全部', ...Array.from(set)]
})

const filteredAssets = computed(() => {
  const keyword = searchTerm.value.trim().toLowerCase()
  return props.assets.filter(t => {
    if (activeCategory.value !== '全部' && t.category !== activeCategory.value) return false
    if (!keyword) return true
    return (
      t.name.toLowerCase().includes(keyword)
      || t.type.toLowerCase().includes(keyword)
    )
  })
})
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
          placeholder="搜索动作资产"
        >
      </div>

      <Button variant="outline" size="default" class="px-2.5" @click="emit('create')">
        <Plus class="h-3.5 w-3.5" />
        新增
      </Button>
    </div>

    <div class="flex flex-wrap gap-1 px-2 pb-2">
      <button
        v-for="category in categories"
        :key="category"
        type="button"
        :class="drawerFilterChipClass(activeCategory === category)"
        @click="activeCategory = category"
      >
        {{ category }}
      </button>
    </div>

    <ul class="flex-1 space-y-1 overflow-auto px-2 pb-2">
      <li v-if="filteredAssets.length === 0" :class="drawerEmptyStateClass">
        没有匹配当前筛选条件的资产。
      </li>
      <li v-for="asset in filteredAssets" :key="asset.id">
        <div :class="drawerListItemClass(asset.id === props.selectedAssetId)">
          <button type="button" class="w-full text-left" @click="emit('select', asset.id)">
            <p class="truncate text-xs font-semibold text-foreground">{{ asset.name }}</p>
            <div class="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{{ asset.category }}</span>
              <span class="font-mono">{{ asset.type }}</span>
            </div>
          </button>

          <div class="mt-2 flex justify-end">
            <Button variant="ghost" size="sm" class="h-7 px-2 text-xs" @click="emit('edit', asset.id)">
              编辑
            </Button>
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>

