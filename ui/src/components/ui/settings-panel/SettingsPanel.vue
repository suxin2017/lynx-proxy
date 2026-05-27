<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { RequestViewMode } from '@/components/ui/network-panels'
import { cn } from '@/lib/utils'
import NetworkPreferencesPanel from './NetworkPreferencesPanel.vue'
import ServerSettingsPanel from './ServerSettingsPanel.vue'
import { settingsPageTitleClass } from './settings-styles'
import type { SettingsPanelPreview } from './types'

interface SettingsPanelProps {
  class?: HTMLAttributes['class']
  preview?: SettingsPanelPreview
  showNetworkPreferences?: boolean
  showServerSettings?: boolean
  connectionState?: string
}

const props = withDefaults(defineProps<SettingsPanelProps>(), {
  showNetworkPreferences: false,
  showServerSettings: true,
})

const viewMode = defineModel<RequestViewMode>('viewMode')
const splitRatio = defineModel<number>('splitRatio')
const tableSplitRatio = defineModel<number>('tableSplitRatio')
const streamEnabled = defineModel<boolean>('streamEnabled')

const emit = defineEmits<{
  reset: []
}>()
</script>

<template>
  <section :class="cn('flex w-full flex-col text-xs', props.class)">
    <header class="flex items-center justify-between gap-2">
      <h1 :class="settingsPageTitleClass">
        设置
      </h1>
    </header>

    <div class="mt-4 space-y-6">
      <NetworkPreferencesPanel
        v-if="showNetworkPreferences && viewMode != null && splitRatio != null && tableSplitRatio != null && streamEnabled != null"
        v-model:view-mode="viewMode"
        v-model:split-ratio="splitRatio"
        v-model:table-split-ratio="tableSplitRatio"
        v-model:stream-enabled="streamEnabled"
        :connection-state="connectionState"
        @reset="emit('reset')"
      />

      <ServerSettingsPanel
        v-if="showServerSettings"
        :preview="preview"
      />
    </div>
  </section>
</template>
