<script setup lang="ts">
import type { ApiRequestDraft } from '../types'
import { Switch } from '@/components/ui/switch'
import { apiStudioFieldClass, apiStudioHintTextClass } from '../api-studio-styles'

const props = defineProps<{
  draft: ApiRequestDraft
}>()

const emit = defineEmits<{
  'update:draft': [draft: ApiRequestDraft]
}>()

function updateSettings(partial: Partial<ApiRequestDraft['settings']>) {
  emit('update:draft', {
    ...props.draft,
    settings: { ...props.draft.settings, ...partial },
  })
}

function onTimeoutInput(ev: Event) {
  const raw = Number((ev.target as HTMLInputElement).value)
  const timeoutMs = Number.isFinite(raw) && raw > 0 ? raw : 30_000
  updateSettings({ timeoutMs })
}
</script>

<template>
  <div class="flex h-full flex-col gap-4 overflow-y-auto px-1 py-1">
    <div class="space-y-1.5">
      <label class="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Timeout (ms)
      </label>
      <input
        type="number"
        min="1000"
        step="1000"
        :class="apiStudioFieldClass"
        :value="props.draft.settings.timeoutMs"
        @input="onTimeoutInput"
      >
      <p :class="apiStudioHintTextClass">
        请求超时时间，默认 30000 ms
      </p>
    </div>

    <div class="flex items-center justify-between gap-3 rounded-sm bg-muted/15 px-2 py-2">
      <div>
        <p class="text-xs font-medium text-foreground">
          Follow redirects
        </p>
        <p :class="apiStudioHintTextClass">
          自动跟随 3xx 重定向
        </p>
      </div>
      <Switch
        :checked="props.draft.settings.followRedirects"
        @update:checked="updateSettings({ followRedirects: $event })"
      />
    </div>

    <div class="flex items-center justify-between gap-3 rounded-sm bg-muted/15 px-2 py-2">
      <div>
        <p class="text-xs font-medium text-foreground">
          SSL certificate verification
        </p>
        <p :class="apiStudioHintTextClass">
          校验目标服务器 TLS 证书
        </p>
      </div>
      <Switch
        :checked="props.draft.settings.validateSsl"
        @update:checked="updateSettings({ validateSsl: $event })"
      />
    </div>
  </div>
</template>
