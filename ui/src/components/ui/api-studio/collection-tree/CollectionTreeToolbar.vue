<script setup lang="ts">
import { computed, ref } from 'vue'
import { FileCode2, FolderPlus, Layers, Plus, Search, Terminal } from '@lucide/vue'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { apiStudioIconButtonClass, apiStudioSearchInputClass } from '../api-studio-styles'
import type { CollectionCreateKind } from '../types'

const props = withDefaults(defineProps<{
  showCreateCollection?: boolean
  showImportCurl?: boolean
}>(), {
  showCreateCollection: false,
  showImportCurl: true,
})

const searchTerm = defineModel<string>('searchTerm', { default: '' })

const emit = defineEmits<{
  create: [kind: CollectionCreateKind]
  'import-curl-click': []
}>()

const menuOpen = ref(false)

const menuItems = computed(() => {
  const items: { kind: CollectionCreateKind | 'import-curl'; label: string; icon: typeof Plus }[] = [
    { kind: 'request', label: '新建请求', icon: FileCode2 },
    { kind: 'folder', label: '新建文件夹', icon: FolderPlus },
  ]
  if (props.showCreateCollection) {
    items.unshift({ kind: 'collection', label: '新建集合', icon: Layers })
  }
  if (props.showImportCurl) {
    items.unshift({ kind: 'import-curl', label: '从 cURL 导入', icon: Terminal })
  }
  return items
})

function onMenuPick(kind: CollectionCreateKind | 'import-curl') {
  menuOpen.value = false
  if (kind === 'import-curl') {
    emit('import-curl-click')
    return
  }
  emit('create', kind)
}
</script>

<template>
  <div class="flex items-center gap-1 border-b border-border/60 px-2 py-1.5">
    <div class="relative min-w-0 flex-1 text-[10px]">
      <Search class="pointer-events-none absolute top-1/2 left-2 size-3 -translate-y-1/2 text-muted-foreground" />
      <input
        v-model="searchTerm"
        type="search"
        :class="[apiStudioSearchInputClass, 'pl-6']"
        placeholder="搜索…"
        autocomplete="off"
        spellcheck="false"
      >
    </div>

    <Popover v-model:open="menuOpen">
      <PopoverTrigger as-child>
        <button
          type="button"
          :class="apiStudioIconButtonClass"
          title="新建"
          aria-label="新建"
        >
          <Plus class="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent class="w-40 p-1" align="end">
        <button
          v-for="item in menuItems"
          :key="item.kind"
          type="button"
          class="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left text-[10px] font-medium text-foreground hover:bg-muted/60"
          @click="onMenuPick(item.kind)"
        >
          <component :is="item.icon" class="size-3.5 shrink-0 text-muted-foreground" />
          {{ item.label }}
        </button>
      </PopoverContent>
    </Popover>
  </div>
</template>
