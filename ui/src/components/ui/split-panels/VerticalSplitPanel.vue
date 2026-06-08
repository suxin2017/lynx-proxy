<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

interface VerticalSplitPanelProps {
  modelValue?: number
  minTopPx?: number
  minBottomPx?: number
  handleHeight?: number
  enabled?: boolean
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<VerticalSplitPanelProps>(), {
  modelValue: 44,
  minTopPx: 220,
  minBottomPx: 220,
  handleHeight: 10,
  enabled: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const containerRef = ref<HTMLElement | null>(null)
const containerHeight = ref(0)
const isDragging = ref(false)

let resizeObserver: ResizeObserver | null = null

function syncContainerHeight() {
  containerHeight.value = containerRef.value?.clientHeight ?? 0
}

function effectiveMinHeights() {
  const available = Math.max(0, containerHeight.value - props.handleHeight)
  if (available <= 0) {
    return { minTop: 0, minBottom: 0 }
  }

  const totalMin = props.minTopPx + props.minBottomPx
  if (available >= totalMin) {
    return { minTop: props.minTopPx, minBottom: props.minBottomPx }
  }

  const minTop = Math.max(0, Math.floor(available * (props.minTopPx / totalMin)))
  return { minTop, minBottom: Math.max(0, available - minTop) }
}

let startY = 0
let startRatio = 44
let pendingClientY: number | null = null
let rafId: number | null = null

const ratio = computed(() => props.modelValue)

const topStyle = computed(() => {
  if (!props.enabled) {
    return undefined
  }

  const { minTop, minBottom } = effectiveMinHeights()

  return {
    flexBasis: `calc(${ratio.value}% - ${props.handleHeight / 2}px)`,
    minHeight: `${minTop}px`,
    maxHeight: `calc(100% - ${minBottom}px - ${props.handleHeight}px)`,
  }
})

const bottomStyle = computed(() => {
  if (!props.enabled) {
    return undefined
  }

  const { minTop, minBottom } = effectiveMinHeights()

  return {
    flexBasis: `calc(${100 - ratio.value}% - ${props.handleHeight / 2}px)`,
    minHeight: `${minBottom}px`,
    maxHeight: `calc(100% - ${minTop}px - ${props.handleHeight}px)`,
  }
})

const clampRatio = (nextRatio: number, containerHeight: number): number => {
  if (!Number.isFinite(containerHeight) || containerHeight <= 0) {
    return 50
  }

  const minRatio = (props.minTopPx / containerHeight) * 100
  const maxRatio = 100 - (props.minBottomPx / containerHeight) * 100

  if (minRatio >= maxRatio) {
    return 50
  }

  return Math.min(maxRatio, Math.max(minRatio, nextRatio))
}

const emitClampedRatio = (nextRatio: number) => {
  const height = containerRef.value?.clientHeight ?? 0
  const clamped = clampRatio(nextRatio, height)

  if (Math.abs(clamped - ratio.value) > 0.01) {
    emit('update:modelValue', Number(clamped.toFixed(2)))
  }
}

const applyPendingMove = () => {
  if (pendingClientY === null) {
    rafId = null
    return
  }

  const height = containerRef.value?.clientHeight ?? 0
  if (height <= 0) {
    rafId = null
    return
  }

  const deltaY = pendingClientY - startY
  const nextRatio = startRatio + (deltaY / height) * 100
  const clamped = clampRatio(nextRatio, height)

  emit('update:modelValue', Number(clamped.toFixed(2)))

  pendingClientY = null
  rafId = null
}

const queueMove = (clientY: number) => {
  pendingClientY = clientY

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
  document.body.classList.remove('select-none', 'cursor-row-resize')

  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)

  if (rafId !== null) {
    window.cancelAnimationFrame(rafId)
    rafId = null
  }

  if (pendingClientY !== null) {
    applyPendingMove()
  }

  pendingClientY = null
}

const handlePointerMove = (event: PointerEvent) => {
  queueMove(event.clientY)
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

  const height = containerRef.value?.clientHeight ?? 0
  if (height <= 0) {
    return
  }

  startY = event.clientY
  startRatio = clampRatio(ratio.value, height)
  isDragging.value = true

  document.body.classList.add('select-none', 'cursor-row-resize')

  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
}

const handleKeyboardResize = (event: KeyboardEvent) => {
  if (!props.enabled) {
    return
  }

  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
    return
  }

  event.preventDefault()

  const step = event.shiftKey ? 2 : 1
  const nextRatio = event.key === 'ArrowUp' ? ratio.value - step : ratio.value + step

  emitClampedRatio(nextRatio)
}

onMounted(() => {
  syncContainerHeight()
  emitClampedRatio(ratio.value)

  if (typeof ResizeObserver !== 'undefined' && containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      syncContainerHeight()
      emitClampedRatio(ratio.value)
    })
    resizeObserver.observe(containerRef.value)
  }
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
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>

<template>
  <div
    ref="containerRef"
    :class="cn('flex min-h-0 w-full flex-col overflow-hidden', props.class)"
  >
    <section
      class="min-h-0 overflow-hidden"
      :style="topStyle"
    >
      <slot name="top" />
    </section>

    <div
      v-if="props.enabled"
      role="separator"
      aria-label="Resize panels"
      aria-orientation="horizontal"
      tabindex="0"
      class="group relative shrink-0"
      :style="{ height: `${props.handleHeight}px` }"
      @pointerdown="handlePointerDown"
      @keydown="handleKeyboardResize"
    >
      <div class="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border transition-colors group-hover:bg-primary/50" />
      <div class="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 cursor-row-resize" />
    </div>

    <section
      class="min-h-0 overflow-hidden"
      :style="bottomStyle"
    >
      <slot name="bottom" />
    </section>
  </div>
</template>
