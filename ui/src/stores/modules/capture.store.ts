import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { WsOp } from '@/lib/generated/ws/v1'
import { useWsConnectionStore } from './ws-connection.store'

interface CaptureStatusPayload {
  recordingStatus?: string
}

interface CaptureStatusChangedEventPayload {
  recordingStatus?: string
}

export const useCaptureStore = defineStore('capture', () => {
  const recordingStatus = ref<string>('unknown')
  const streamSubscribed = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const wsConnectionStore = useWsConnectionStore()
  let detachEventListener: (() => void) | null = null

  const isRecording = computed(() => recordingStatus.value === 'recording')

  const refreshStatus = async () => {
    loading.value = true
    error.value = null

    try {
      const result = await wsConnectionStore.call<CaptureStatusPayload>(
        WsOp.CaptureStatusGet,
      )
      recordingStatus.value = result?.recordingStatus ?? 'unknown'
    } catch (err) {
      error.value = String(err)
    } finally {
      loading.value = false
    }
  }

  const setRecording = async (recording: boolean) => {
    loading.value = true
    error.value = null

    try {
      await wsConnectionStore.call(WsOp.CaptureControlSet, { recording })
      await refreshStatus()
    } catch (err) {
      error.value = String(err)
    } finally {
      loading.value = false
    }
  }

  const subscribeStream = async () => {
    error.value = null

    try {
      await wsConnectionStore.call(WsOp.RequestStreamSubscribe)
      streamSubscribed.value = true
    } catch (err) {
      error.value = String(err)
    }
  }

  const unsubscribeStream = async () => {
    error.value = null

    try {
      await wsConnectionStore.call(WsOp.RequestStreamUnsubscribe)
      streamSubscribed.value = false
    } catch (err) {
      error.value = String(err)
    }
  }

  const handleServerEvent = () => {
    if (detachEventListener) {
      return
    }

    detachEventListener = wsConnectionStore.onEvent((frame) => {
      if (frame.op === WsOp.CaptureStatusChanged) {
        const payload = frame.payload as CaptureStatusChangedEventPayload | undefined
        recordingStatus.value = payload?.recordingStatus ?? recordingStatus.value
      }
    })
  }

  watch(
    () => wsConnectionStore.isConnected,
    (connected, wasConnected) => {
      if (!connected || wasConnected) {
        return
      }

      handleServerEvent()
      void refreshStatus()
    },
  )

  const dispose = () => {
    detachEventListener?.()
    detachEventListener = null
  }

  return {
    recordingStatus,
    streamSubscribed,
    loading,
    error,
    isRecording,
    refreshStatus,
    setRecording,
    subscribeStream,
    unsubscribeStream,
    handleServerEvent,
    dispose,
  }
})
