<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Button, NetworkRequestDetail } from '@/components'
import { type TrafficRecord } from '@/components/ui/request-tree'
import { HorizontalSplitPanel, VerticalSplitPanel } from '@/components/ui/split-panels'
import { NetworkRequestPanel, type RequestViewMode } from '@/components/ui/network-panels'
import { useCaptureStore, useRequestStreamStore, useSettingsStore } from '@/stores'
import { Disc2, ListTree, PlugZap, BrushCleaning, Sheet } from '@lucide/vue'
import { cn } from '@/lib/utils'

const captureStore = useCaptureStore()
const requestStreamStore = useRequestStreamStore()
const settingsStore = useSettingsStore()

const {
  viewMode: requestViewMode,
  splitRatio,
  tableSplitRatio,
  streamEnabled,
} = storeToRefs(settingsStore)

const isDesktop = ref(false)

let mediaQueryList: MediaQueryList | null = null
let detachMediaQuery: (() => void) | null = null

const bindDesktopMediaQuery = () => {
  if (typeof window === 'undefined') {
    return
  }

  mediaQueryList = window.matchMedia('(min-width: 1024px)')

  const updateDesktopState = () => {
    isDesktop.value = mediaQueryList?.matches ?? false
  }

  updateDesktopState()

  mediaQueryList.addEventListener('change', updateDesktopState)
  detachMediaQuery = () => {
    mediaQueryList?.removeEventListener('change', updateDesktopState)
  }
}

const selectedTraceId = computed({
  get: () => requestStreamStore.selectedId,
  set: (value: string | undefined) => {
    requestStreamStore.select(value)
  },
})

const startStream = async () => {
  await requestStreamStore.start()
  await requestStreamStore.subscribe()
}

const stopStream = async () => {
  await requestStreamStore.unsubscribe()
}

const setStreamEnabled = async (enabled: boolean) => {
  streamEnabled.value = enabled

  if (enabled) {
    await startStream()
  } else {
    await stopStream()
  }
}

const setRecording = async (enabled: boolean) => {
  await captureStore.setRecording(enabled)
}

const handleRequestSelect = (request: TrafficRecord) => {
  requestStreamStore.select(request.id)
}

const handleViewModeChange = (mode: RequestViewMode) => {
  requestViewMode.value = mode
}

watch(streamEnabled, async (enabled, previous) => {
  if (previous === undefined) {
    return
  }

  if (enabled) {
    await startStream()
  } else {
    await stopStream()
  }
})

onMounted(async () => {
  settingsStore.hydrate()
  bindDesktopMediaQuery()
  captureStore.handleServerEvent()
  await captureStore.refreshStatus()

  if (streamEnabled.value) {
    await startStream()
  }
})

onBeforeUnmount(async () => {
  detachMediaQuery?.()
  detachMediaQuery = null
  mediaQueryList = null

  await requestStreamStore.stop()
  captureStore.dispose()
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-col  overflow-hidden">
    <div class="flex items-center justify-between px-1">
      <div class="inline-flex items-center gap-1">
        <Button
          size="icon-sm"
          variant="ghost"
          title="Table View"
          :aria-pressed="requestViewMode === 'table'"
          @click="handleViewModeChange('table')"
        >
          <Sheet :class="cn('h-4 w-4', requestViewMode === 'table' ? 'text-primary' : 'text-muted-foreground/60')" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          title="Tree View"
          :aria-pressed="requestViewMode === 'tree'"
          @click="handleViewModeChange('tree')"
        >
          <ListTree :class="cn('h-4 w-4', requestViewMode === 'tree' ? 'text-primary' : 'text-muted-foreground/60')" />
        </Button>
      </div>

      <div class="flex items-center gap-3">
        <Button
          size="icon-sm"
          variant="ghost"
          :title="streamEnabled ? 'Disable Stream' : 'Enable Stream'"
          :aria-pressed="streamEnabled"
          @click="setStreamEnabled(!streamEnabled)"
        >
          <PlugZap :class="cn('h-4 w-4', streamEnabled ? 'text-primary' : 'text-muted-foreground/60')" />
        </Button>

        <Button
          size="icon-sm"
          variant="ghost"
          :title="captureStore.isRecording ? 'Stop Capture' : 'Start Capture'"
          :disabled="captureStore.loading"
          :aria-pressed="captureStore.isRecording"
          @click="setRecording(!captureStore.isRecording)"
        >
          <Disc2 :class="cn('h-4 w-4', captureStore.isRecording ? 'text-primary' : 'text-muted-foreground/60')" />
        </Button>

        <Button size="icon-sm" variant="ghost" title="Clear Requests" @click="requestStreamStore.clear">
          <BrushCleaning class="h-4 w-4 text-muted-foreground/70" />
        </Button>
      </div>
    </div>

    <VerticalSplitPanel
      v-if="requestViewMode === 'table'"
      v-model="tableSplitRatio"
      class="flex-1"
      :min-top-px="220"
      :min-bottom-px="220"
    >
      <template #top>
        <section class="h-full rounded-md bg-card/60">
          <NetworkRequestPanel
            v-model="selectedTraceId"
            :requests="requestStreamStore.trafficRecords"
            :view-mode="requestViewMode"
            @select="handleRequestSelect"
          />
        </section>
      </template>

      <template #bottom>
        <section class="h-full rounded-md bg-card/60">
          <NetworkRequestDetail :record="requestStreamStore.selectedRecord" class="h-full" />
        </section>
      </template>
    </VerticalSplitPanel>

    <HorizontalSplitPanel
      v-else
      v-model="splitRatio"
      :enabled="isDesktop"
      class="min-h-0 flex-1"
      :min-left-px="320"
      :min-right-px="360"
    >
      <template #left>
        <section class="h-full rounded-md bg-card/60">
          <NetworkRequestPanel
            v-model="selectedTraceId"
            :requests="requestStreamStore.trafficRecords"
            :view-mode="requestViewMode"
            @select="handleRequestSelect"
          />
        </section>
      </template>

      <template #right>
        <section class="h-full rounded-md bg-card/60">
          <NetworkRequestDetail :record="requestStreamStore.selectedRecord" class="h-full" />
        </section>
      </template>
    </HorizontalSplitPanel>
  </div>
</template>
