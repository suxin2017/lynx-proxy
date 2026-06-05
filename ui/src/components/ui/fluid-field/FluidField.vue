<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { cn } from '@/lib/utils'

const model = defineModel<string>({ required: true })

const props = withDefaults(defineProps<{
  placeholder?: string
  mono?: boolean
  disabled?: boolean
  /** Extra min height when focused; 0 = match anchor row only until content grows. */
  minExpandedPx?: number
  maxExpandedPx?: number
  class?: HTMLAttributes['class']
}>(), {
  placeholder: '',
  mono: false,
  disabled: false,
  minExpandedPx: 0,
  maxExpandedPx: 240,
})

const fieldSurfaceClass =
  'rounded-sm bg-background px-2 py-1.5 text-xs text-foreground'

const fieldBorderIdleClass = 'border border-border/70'

const fieldBorderEditingClass =
  'border border-ring ring-1 ring-ring/40'

const anchorClass = cn(
  fieldSurfaceClass,
  fieldBorderIdleClass,
  'box-border block h-7 max-h-7 min-h-7 w-full overflow-hidden truncate text-left outline-none',
  'hover:border-border hover:bg-muted',
)

const editorClass = cn(
  fieldSurfaceClass,
  fieldBorderEditingClass,
  'box-border w-full resize-none overflow-y-hidden outline-none placeholder:text-muted-foreground',
)

const editing = ref(false)
const anchorRef = ref<HTMLElement | null>(null)
const overlayRef = ref<HTMLElement | null>(null)
const editorRef = ref<HTMLTextAreaElement | null>(null)
const anchorHeightPx = ref(28)
const suppressOutsideClose = ref(false)

const overlayStyle = ref({
  top: '0px',
  left: '0px',
  width: '0px',
})

const displayText = computed(() => model.value || props.placeholder)

function syncEditorHeight() {
  const el = editorRef.value
  if (!el) return

  const anchorH = anchorHeightPx.value
  const floor = props.minExpandedPx > 0
    ? Math.max(anchorH, props.minExpandedPx)
    : anchorH

  el.style.overflowY = 'hidden'
  el.style.minHeight = `${anchorH}px`
  el.style.height = `${anchorH}px`

  const contentHeight = el.scrollHeight
  const next = Math.min(props.maxExpandedPx, Math.max(floor, contentHeight))
  el.style.height = `${next}px`
  el.style.overflowY = contentHeight > props.maxExpandedPx ? 'auto' : 'hidden'
}

function updateOverlayPosition() {
  const anchor = anchorRef.value
  if (!anchor) return
  const rect = anchor.getBoundingClientRect()
  anchorHeightPx.value = rect.height
  overlayStyle.value = {
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
  }
}

function openEditor() {
  if (props.disabled || editing.value) return

  suppressOutsideClose.value = true
  editing.value = true

  nextTick(() => {
    updateOverlayPosition()
    const el = editorRef.value
    if (!el) return
    el.focus()
    const end = el.value.length
    el.setSelectionRange(end, end)
    syncEditorHeight()
    requestAnimationFrame(() => {
      syncEditorHeight()
      window.setTimeout(() => {
        suppressOutsideClose.value = false
      }, 0)
    })
  })
}

function resetEditorStyles() {
  const el = editorRef.value
  if (!el) return
  el.style.height = ''
  el.style.minHeight = ''
  el.style.overflowY = ''
}

function closeEditor() {
  resetEditorStyles()
  editing.value = false
}

function onEditorInput() {
  syncEditorHeight()
}

function onEditorKeydown(ev: KeyboardEvent) {
  if (ev.key === 'Escape') {
    ev.preventDefault()
    closeEditor()
    anchorRef.value?.querySelector('button')?.focus()
  }
}

let clickOutsideStop: (() => void) | undefined

watch(editing, (open) => {
  clickOutsideStop?.()
  clickOutsideStop = undefined
  if (!open) return

  window.setTimeout(() => {
    clickOutsideStop = onClickOutside(
      overlayRef,
      () => {
        if (suppressOutsideClose.value) return
        closeEditor()
      },
      { ignore: [anchorRef] },
    )
  }, 0)
})

function onWindowChange() {
  if (!editing.value) return
  updateOverlayPosition()
  nextTick(syncEditorHeight)
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', onWindowChange)
  window.addEventListener('scroll', onWindowChange, true)
}

onBeforeUnmount(() => {
  clickOutsideStop?.()
  window.removeEventListener('resize', onWindowChange)
  window.removeEventListener('scroll', onWindowChange, true)
})

watch(model, () => {
  if (editing.value) {
    nextTick(syncEditorHeight)
  }
})
</script>

<template>
  <div
    ref="anchorRef"
    :class="cn('relative z-0 min-w-0', props.class)"
  >
    <button
      type="button"
      :disabled="props.disabled"
      :class="cn(
        anchorClass,
        props.mono && 'font-mono',
        !model && 'text-muted-foreground',
        props.disabled && 'cursor-not-allowed opacity-50',
        editing && 'border-ring/60 ring-1 ring-ring/25',
      )"
      :title="model || undefined"
      :aria-label="props.placeholder || '编辑'"
      :aria-expanded="editing"
      @click="openEditor"
      @keydown.enter.prevent="openEditor"
      @keydown.space.prevent="openEditor"
    >
      {{ displayText }}
    </button>

    <Teleport to="body">
      <div
        v-if="editing"
        ref="overlayRef"
        class="fixed z-[200]"
        :style="overlayStyle"
        @mousedown.stop
      >
        <textarea
          ref="editorRef"
          v-model="model"
          :disabled="props.disabled"
          :placeholder="props.placeholder"
          :class="cn(editorClass, props.mono && 'font-mono')"
          @input="onEditorInput"
          @keydown="onEditorKeydown"
        />
      </div>
    </Teleport>
  </div>
</template>
