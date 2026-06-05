<script setup lang="ts">
import { onMounted, provide, ref, shallowRef } from 'vue'
import { storeToRefs } from 'pinia'
import { ApiStudioShell } from '@/components/ui/api-studio'
import type { ApiRequestDraft } from '@/components/ui/api-studio/types'
import { COLLECTION_PERSISTENCE_KEY } from '@/components/ui/api-studio/collection-persistence'
import { useApiStudioStore } from '@/stores/modules/api-studio.store'

const apiStudioStore = useApiStudioStore()
const { nodes, drafts, selectedId, loading, error } = storeToRefs(apiStudioStore)

provide(COLLECTION_PERSISTENCE_KEY, apiStudioStore.collectionPersistence)

const shellRef = shallowRef<InstanceType<typeof ApiStudioShell> | null>(null)
const hydrated = ref(false)

onMounted(async () => {
  try {
    await apiStudioStore.hydrate()
  }
  finally {
    hydrated.value = true
  }
})

function onDraftsUpdate(next: Record<string, ApiRequestDraft>) {
  apiStudioStore.syncDraftsFromShell(next)
}

async function onSend(
  draft: ApiRequestDraft,
  tabId: string,
  requestNodeId: string | undefined,
) {
  const shell = shellRef.value
  if (!shell) return

  shell.applyActiveTabResult({ loading: true, error: null, response: null })

  if (requestNodeId) {
    const node = nodes.value.find(n => n.id === requestNodeId)
    if (node?.draftId) {
      try {
        await apiStudioStore.persistDraft(node.draftId, draft)
        shell.clearTabDirty(tabId)
      }
      catch (err) {
        error.value = String(err)
      }
    }
  }

  try {
    const response = await apiStudioStore.sendRequest(draft)
    shell.applyActiveTabResult({
      loading: false,
      response,
      error: response?.errorMessage ?? null,
    })
  }
  catch (err) {
    shell.applyActiveTabResult({
      loading: false,
      response: null,
      error: String(err),
    })
  }

}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div
      v-if="loading && nodes.length === 0"
      class="flex flex-1 items-center justify-center text-xs text-muted-foreground"
    >
      加载 API Studio…
    </div>

    <div
      v-else-if="error && nodes.length === 0"
      class="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center text-xs text-destructive"
    >
      <p>{{ error }}</p>
      <button
        type="button"
        class="rounded-md border border-border px-3 py-1.5 text-foreground hover:bg-muted/40"
        @click="apiStudioStore.hydrate()"
      >
        重试
      </button>
    </div>

    <ApiStudioShell
      v-else
      ref="shellRef"
      v-model:nodes="nodes"
      v-model:selected-id="selectedId"
      :drafts="drafts"
      :hydrated="hydrated"
      class="h-full min-h-0 flex-1 !min-h-0 !rounded-none !border-0"
      @update:drafts="onDraftsUpdate"
      @send="onSend"
    />
  </div>
</template>
