<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

interface HorizontalSplitPanelProps {
  modelValue?: number
  minLeftPx?: number
  minRightPx?: number
  handleWidth?: number
  enabled?: boolean
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<HorizontalSplitPanelProps>(), {
  modelValue: 42,
  minLeftPx: 280,
  minRightPx: 360,
  handleWidth: 10,
  enabled: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const containerRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)

let startX = 0
let startRatio = 42
let pendingClientX: number | null = null
let rafId: number | null = null

const ratio = computed(() => props.modelValue)

const leftStyle = computed(() => {
  if (!props.enabled) {
    return undefined
  }

  return {
    flexBasis: `calc(${ratio.value}% - ${props.handleWidth / 2}px)`,
    minWidth: `${props.minLeftPx}px`,
    maxWidth: `calc(100% - ${props.minRightPx}px)`,
  }
})

const rightStyle = computed(() => {
  if (!props.enabled) {
    return undefined
  }

  return {
    flexBasis: `calc(${100 - ratio.value}% - ${props.handleWidth / 2}px)`,
    minWidth: `${props.minRightPx}px`,
    maxWidth: `calc(100% - ${props.minLeftPx}px)`,
  }
})

const clampRatio = (nextRatio: number, containerWidth: number): number => {
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) {
    return 50
  }

  const minRatio = (props.minLeftPx / containerWidth) * 100
  const maxRatio = 100 - (props.minRightPx / containerWidth) * 100

  if (minRatio >= maxRatio) {
    return 50
  }

  return Math.min(maxRatio, Math.max(minRatio, nextRatio))
}

const emitClampedRatio = (nextRatio: number) => {
  const width = containerRef.value?.clientWidth ?? 0
  const clamped = clampRatio(nextRatio, width)

  if (Math.abs(clamped - ratio.value) > 0.01) {
    emit('update:modelValue', Number(clamped.toFixed(2)))
  }
}

const applyPendingMove = () => {
  if (pendingClientX === null) {
    rafId = null
    return
  }

  const width = containerRef.value?.clientWidth ?? 0
  if (width <= 0) {
    rafId = null
    return
  }

  const deltaX = pendingClientX - startX
  const nextRatio = startRatio + (deltaX / width) * 100
  const clamped = clampRatio(nextRatio, width)

  emit('update:modelValue', Number(clamped.toFixed(2)))

  pendingClientX = null
  rafId = null
}

const queueMove = (clientX: number) => {
  pendingClientX = clientX

  if (rafId !== null) {
    return
  }

  rafId = window.requestAnimationFrame(applyPendingMove)
}

const finishDrag = () => {
  if (!isDragging.value) {
    return
  }

  isDragging.value = false
  document.body.classList.remove('select-none', 'cursor-col-resize')

  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)

  if (rafId !== null) {
    window.cancelAnimationFrame(rafId)
    rafId = null
  }

  if (pendingClientX !== null) {
    applyPendingMove()
  }

  pendingClientX = null
}

const handlePointerMove = (event: PointerEvent) => {
  queueMove(event.clientX)
}

const handlePointerUp = () => {
  finishDrag()
}

const handlePointerDown = (event: PointerEvent) => {
  if (!props.enabled) {
    return
  }

  if (event.button !== 0) {
    return
  }

  const width = containerRef.value?.clientWidth ?? 0
  if (width <= 0) {
    return
  }

  startX = event.clientX
  startRatio = clampRatio(ratio.value, width)
  isDragging.value = true

  document.body.classList.add('select-none', 'cursor-col-resize')

  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
}

const handleKeyboardResize = (event: KeyboardEvent) => {
  if (!props.enabled) {
    return
  }

  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
    return
  }

  event.preventDefault()

  const step = event.shiftKey ? 2 : 1
  const nextRatio = event.key === 'ArrowLeft' ? ratio.value - step : ratio.value + step

  emitClampedRatio(nextRatio)
}

onMounted(() => {
  emitClampedRatio(ratio.value)
})

watch(() => props.enabled, (enabled) => {
  if (!enabled) {
    finishDrag()
    return
  }

  emitClampedRatio(ratio.value)
})

watch(() => props.modelValue, (value) => {
  emitClampedRatio(value)
})

onBeforeUnmount(() => {
  finishDrag()
})
</script>

<template>
  <div
    ref="containerRef"
    :class="cn('flex min-h-0 w-full', props.enabled ? 'flex-row' : 'flex-col gap-3', props.class)"
  >
    <section
      class="min-h-0 min-w-0 overflow-hidden"
      :style="leftStyle"
    >
      <slot name="left" />
    </section>

    <div
      v-if="props.enabled"
      role="separator"
      aria-label="Resize panels"
      aria-orientation="vertical"
      tabindex="0"
      class="group relative shrink-0"
      :style="{ width: `${props.handleWidth}px` }"
      @pointerdown="handlePointerDown"
      @keydown="handleKeyboardResize"
    >
      <div class="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border transition-colors group-hover:bg-primary/50" />
      <div class="absolute inset-y-0 left-1/2 w-3 -translate-x-1/2 cursor-col-resize" />
    </div>

    <section
      class="min-h-0 min-w-0 overflow-hidden"
      :style="rightStyle"
    >
      <slot name="right" />
    </section>
  </div>
</template>
