<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Button, NetworkRequestDetail } from '@/components'
import { type TrafficRecord } from '@/components/ui/request-tree'
import { HorizontalSplitPanel, VerticalSplitPanel } from '@/components/ui/split-panels'
import { NetworkRequestPanel, type RequestViewMode } from '@/components/ui/network-panels'
import { useCaptureStore, useRequestStreamStore } from '@/stores'
import { Disc2, ListTree, PlugZap, Table2, BrushCleaning, Sheet } from '@lucide/vue'
import { cn } from '@/lib/utils'

const VIEW_MODE_STORAGE_KEY = 'lynx.network.viewMode'
const SPLIT_RATIO_STORAGE_KEY = 'lynx.network.splitRatio'
const TABLE_SPLIT_RATIO_STORAGE_KEY = 'lynx.network.tableSplitRatio'
const STREAM_ENABLED_STORAGE_KEY = 'lynx.network.streamEnabled'
const DEFAULT_SPLIT_RATIO = 42
const DEFAULT_TABLE_SPLIT_RATIO = 44

const captureStore = useCaptureStore()
const requestStreamStore = useRequestStreamStore()

const requestViewMode = ref<RequestViewMode>('table')
const splitRatio = ref(DEFAULT_SPLIT_RATIO)
const tableSplitRatio = ref(DEFAULT_TABLE_SPLIT_RATIO)
const streamEnabled = ref(true)
const isDesktop = ref(false)

let mediaQueryList: MediaQueryList | null = null
let detachMediaQuery: (() => void) | null = null

const clampSplitRatio = (value: number) => {
  return Math.min(80, Math.max(20, value))
}

const hydrateLayoutPreference = () => {
  if (typeof window === 'undefined') {
    return
  }

  const storedMode = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY)
  if (storedMode === 'table' || storedMode === 'tree') {
    requestViewMode.value = storedMode
  }

  const storedRatio = Number(window.localStorage.getItem(SPLIT_RATIO_STORAGE_KEY))
  if (Number.isFinite(storedRatio)) {
    splitRatio.value = clampSplitRatio(storedRatio)
  }

  const storedTableRatio = Number(window.localStorage.getItem(TABLE_SPLIT_RATIO_STORAGE_KEY))
  if (Number.isFinite(storedTableRatio)) {
    tableSplitRatio.value = clampSplitRatio(storedTableRatio)
  }

  const storedStreamEnabled = window.localStorage.getItem(STREAM_ENABLED_STORAGE_KEY)
  if (storedStreamEnabled === '0') {
    streamEnabled.value = false
  }
}

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

watch(requestViewMode, (mode) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode)
})

watch(splitRatio, (value) => {
  const clamped = clampSplitRatio(value)

  if (Math.abs(clamped - value) > 0.01) {
    splitRatio.value = clamped
    return
  }

  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(SPLIT_RATIO_STORAGE_KEY, clamped.toFixed(2))
})

watch(tableSplitRatio, (value) => {
  const clamped = clampSplitRatio(value)

  if (Math.abs(clamped - value) > 0.01) {
    tableSplitRatio.value = clamped
    return
  }

  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(TABLE_SPLIT_RATIO_STORAGE_KEY, clamped.toFixed(2))
})

watch(streamEnabled, (enabled) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STREAM_ENABLED_STORAGE_KEY, enabled ? '1' : '0')
})

onMounted(async () => {
  hydrateLayoutPreference()
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
          <Disc2 :class="cn('h-4 w-4', captureStore.isRecording ?'text-muted-foreground/60': 'text-primary')" />
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
