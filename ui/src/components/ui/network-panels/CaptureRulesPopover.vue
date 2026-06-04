<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { Button } from '@/components'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useCaptureRulesStore } from '@/stores'

const captureRulesStore = useCaptureRulesStore()
const { open, loading, focusRules, ignoreRules } = storeToRefs(captureRulesStore)

const hasAnyRules = computed(() => focusRules.value.length > 0 || ignoreRules.value.length > 0)

onMounted(async () => {
  // Warm cache so the panel opens instantly.
  try {
    await captureRulesStore.refresh()
  } catch {
    // ignore
  }
})
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <slot />
    </PopoverTrigger>
    <PopoverContent class="w-[420px] p-0" align="end">
      <div class="flex items-center justify-between border-b border-border px-2 py-1.5">
        <div class="text-xs font-medium">
          聚焦 / 忽略
        </div>
        <Button
          size="sm"
          variant="ghost"
          class="h-6 px-2 text-xs"
          :disabled="loading || !hasAnyRules"
          @click="captureRulesStore.clearAll"
        >
          全部清除
        </Button>
      </div>

      <div class="px-2 py-2">
        <div v-if="loading" class="text-xs text-muted-foreground">
          加载中…
        </div>

        <div class="space-y-2" :class="loading ? 'mt-2' : 'mt-0.5'">
          <section>
            <div class="mb-0.5 text-xs font-medium">
              聚焦
            </div>
            <div v-if="focusRules.length === 0" class="text-xs text-muted-foreground">
              暂无规则
            </div>
            <div v-else class="space-y-1">
              <div
                v-for="rule in focusRules"
                :key="rule.id"
                class="flex items-center justify-between gap-2 rounded-sm border border-border bg-card/40 px-2 py-1"
              >
                <div class="min-w-0 flex-1">
                  <div class="truncate font-mono text-[11px] text-foreground/90">
                    {{ rule.matchExpr || rule.name || `聚焦 #${rule.id}` }}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  class="h-6 shrink-0 px-2 text-xs text-muted-foreground hover:text-foreground"
                  @click="captureRulesStore.deleteFocus(rule.id)"
                >
                  删除
                </Button>
              </div>
            </div>
          </section>

          <section>
            <div class="mb-0.5 text-xs font-medium">
              忽略
            </div>
            <div v-if="ignoreRules.length === 0" class="text-xs text-muted-foreground">
              暂无规则
            </div>
            <div v-else class="space-y-1">
              <div
                v-for="rule in ignoreRules"
                :key="rule.id"
                class="flex items-center justify-between gap-2 rounded-sm border border-border bg-card/40 px-2 py-1"
              >
                <div class="min-w-0 flex-1">
                  <div class="truncate font-mono text-[11px] text-foreground/90">
                    {{ rule.matchExpr || rule.name || `忽略 #${rule.id}` }}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  class="h-6 shrink-0 px-2 text-xs text-muted-foreground hover:text-foreground"
                  @click="captureRulesStore.deleteIgnore(rule.id)"
                >
                  删除
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>

