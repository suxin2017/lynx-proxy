<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Button } from '@/components'
import { useCaptureStore, useWsConnectionStore } from '@/stores'
import { Check } from '@lucide/vue'

const wsConnectionStore = useWsConnectionStore()
const captureStore = useCaptureStore()

const eventCount = computed(() => wsConnectionStore.recentEvents.length)

onMounted(() => {
  captureStore.handleServerEvent()
  captureStore.refreshStatus()
})
</script>

<template>
  <div class="flex min-h-[calc(100svh-57px)] items-center justify-center p-6">
    <div class="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-md">
      <div class="mb-6 flex items-center justify-center">
        <Check class="mr-2 h-8 w-8 text-green-500" />
        <h1 class="text-3xl font-bold text-foreground">欢迎</h1>
      </div>

      <p class="mb-4 text-center text-muted-foreground">
        WS v1 Protocol Console
      </p>

      <div class="mb-3 rounded-md bg-muted p-4 text-left">
        <p class="text-sm text-muted-foreground">连接状态</p>
        <p class="text-lg font-semibold text-foreground">{{ wsConnectionStore.state }}</p>
      </div>

      <div class="mb-3 rounded-md bg-muted p-4 text-left">
        <p class="text-sm text-muted-foreground">采集状态</p>
        <p class="text-lg font-semibold text-foreground">{{ captureStore.recordingStatus }}</p>
      </div>

      <div class="mb-6 rounded-md bg-muted p-4 text-left">
        <p class="text-sm text-muted-foreground">事件缓存</p>
        <p class="text-lg font-semibold text-foreground">{{ eventCount }} 条</p>
      </div>

      <div class="mb-3 flex gap-2">
        <Button @click="captureStore.refreshStatus" class="flex-1" :disabled="captureStore.loading">
          刷新状态
        </Button>
        <Button
          @click="captureStore.setRecording(!captureStore.isRecording)"
          variant="outline"
          class="flex-1"
          :disabled="captureStore.loading"
        >
          {{ captureStore.isRecording ? '停止录制' : '开始录制' }}
        </Button>
      </div>

      <div class="mb-4 flex gap-2">
        <Button
          @click="captureStore.subscribeStream"
          class="flex-1"
          :disabled="captureStore.streamSubscribed"
        >
          订阅流
        </Button>
        <Button
          @click="captureStore.unsubscribeStream"
          variant="outline"
          class="flex-1"
          :disabled="!captureStore.streamSubscribed"
        >
          取消订阅
        </Button>
      </div>

      <p v-if="captureStore.error" class="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
        {{ captureStore.error }}
      </p>

      <nav class="flex gap-2">
        <router-link to="/" class="flex-1 text-center text-sm text-blue-500 hover:underline">
          首页
        </router-link>
        <router-link to="/network" class="flex-1 text-center text-sm text-blue-500 hover:underline">
          Network
        </router-link>
        <router-link to="/about" class="flex-1 text-center text-sm text-blue-500 hover:underline">
          关于
        </router-link>
      </nav>
    </div>
  </div>
</template>
