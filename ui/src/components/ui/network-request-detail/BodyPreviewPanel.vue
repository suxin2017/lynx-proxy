<script setup lang="ts">
import { Check, Copy } from '@lucide/vue'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { bodyKindToCodeMirrorLanguage, bodyKindUsesSoftWrap } from '@/lib/http/body-codemirror'
import {
  assessBodyDisplay,
  bodyTooLargeHint,
  bodyTooLargeMessage,
  formatByteSize,
  MAX_BODY_STORE_BYTES,
} from '@/lib/http/body-display-limits'
import {
  formatBase64Body,
  formatHexDump,
  formatJsonBody,
  formatMultipartForm,
  formatSseBody,
  formatTextBody,
  formatUrlEncodedForm,
} from '@/lib/http/body-formatters'
import {
  bodyPreviewKindLabel,
  listAvailablePreviewKinds,
  resolveBodyPreviewKind,
  type BodyPreviewKind,
} from '@/lib/http/body-preview-kind'
import BodyFormTable from './BodyFormTable.vue'
import BodyMediaView from './BodyMediaView.vue'
import BodyReadonlyEditor from './BodyReadonlyEditor.vue'
import DetailPillNav from './DetailPillNav.vue'

const CODE_MIRROR_KINDS = new Set<BodyPreviewKind>([
  'json',
  'text',
  'html',
  'xml',
  'css',
  'javascript',
  'hex',
  'base64',
  'sse',
])

const props = withDefaults(
  defineProps<{
    bytes?: Uint8Array
    /** 仅用于过大占位展示，避免为 Story/测试分配超大 TypedArray */
    reportedByteLength?: number
    contentType?: string
    truncated?: boolean
    isWebSocket?: boolean
    emptyLabel?: string
  }>(),
  {
    emptyLabel: '无 Body',
  },
)

const activeKind = ref<BodyPreviewKind>('text')

const displayAssessment = computed(() =>
  assessBodyDisplay(props.bytes, props.reportedByteLength),
)

const byteLength = computed(() =>
  displayAssessment.value.byteLength,
)

const canRenderBody = computed(() => displayAssessment.value.renderable)

const availableKinds = computed(() => {
  if (!displayAssessment.value.renderable) {
    return []
  }

  return listAvailablePreviewKinds(byteLength.value, props.contentType, {
    isWebSocket: props.isWebSocket,
  })
})

const pillOptions = computed(() => {
  return availableKinds.value.map(kind => ({
    value: kind,
    label: bodyPreviewKindLabel(kind),
  }))
})

const defaultKind = computed(() => {
  if (byteLength.value <= 0) {
    return 'text' as BodyPreviewKind
  }

  const kinds = availableKinds.value
  const preferred = resolveBodyPreviewKind(props.contentType, {
    isWebSocket: props.isWebSocket,
  })

  if (kinds.includes(preferred)) {
    return preferred
  }

  return kinds[0] ?? 'text'
})

watch(
  [defaultKind, availableKinds],
  () => {
    if (availableKinds.value.length === 0) {
      return
    }

    if (!availableKinds.value.includes(activeKind.value)) {
      activeKind.value = defaultKind.value
    }
  },
  { immediate: true },
)

const editorContent = computed(() => {
  if (!canRenderBody.value || !props.bytes) {
    return ''
  }

  const kind = activeKind.value

  switch (kind) {
    case 'json':
      return formatJsonBody(props.bytes, props.contentType).display
    case 'hex':
      return formatHexDump(props.bytes)
    case 'base64':
      return formatBase64Body(props.bytes)
    case 'sse':
      return formatSseBody(props.bytes, props.contentType)
    case 'text':
    case 'html':
    case 'xml':
    case 'css':
    case 'javascript':
      return formatTextBody(props.bytes, props.contentType)
    default:
      return ''
  }
})

const editorLanguage = computed(() => {
  return bodyKindToCodeMirrorLanguage(activeKind.value, props.contentType)
})

const editorSoftWrap = computed(() => bodyKindUsesSoftWrap(activeKind.value))

const showCodeEditor = computed(() =>
  canRenderBody.value && CODE_MIRROR_KINDS.has(activeKind.value),
)

const formRows = computed(() => {
  if (!canRenderBody.value || !props.bytes) {
    return []
  }

  if (activeKind.value === 'form-urlencoded') {
    return formatUrlEncodedForm(props.bytes, props.contentType)
  }

  if (activeKind.value === 'form-multipart') {
    return formatMultipartForm(props.bytes, props.contentType)
  }

  return []
})

const isEmpty = computed(() => byteLength.value === 0)

const isMediaKind = (kind: BodyPreviewKind) => {
  return kind === 'media-image' || kind === 'media-video' || kind === 'media-font'
}

function formatFormRowsForCopy(rows: { key: string, value: string }[]): string {
  return rows.map(row => `${row.key}\t${row.value}`).join('\n')
}

const copyableContent = computed(() => {
  if (!canRenderBody.value || !props.bytes) {
    return ''
  }

  const kind = activeKind.value

  if (CODE_MIRROR_KINDS.has(kind)) {
    return editorContent.value
  }

  if (kind === 'form-urlencoded' || kind === 'form-multipart') {
    return formatFormRowsForCopy(formRows.value)
  }

  if (isMediaKind(kind)) {
    return formatBase64Body(props.bytes)
  }

  return ''
})

const canCopy = computed(() => copyableContent.value.length > 0)

const copyState = ref<'idle' | 'copied' | 'failed'>('idle')
let copyStateTimer: ReturnType<typeof setTimeout> | null = null

function resetCopyState() {
  if (copyStateTimer) {
    clearTimeout(copyStateTimer)
    copyStateTimer = null
  }

  copyState.value = 'idle'
}

function scheduleCopyStateReset() {
  if (copyStateTimer) {
    clearTimeout(copyStateTimer)
  }

  copyStateTimer = setTimeout(() => {
    copyState.value = 'idle'
    copyStateTimer = null
  }, 1600)
}

async function handleCopy() {
  const content = copyableContent.value
  if (!content) {
    copyState.value = 'failed'
    scheduleCopyStateReset()
    return
  }

  try {
    if (!globalThis.navigator?.clipboard?.writeText) {
      throw new Error('Clipboard API is unavailable')
    }

    await globalThis.navigator.clipboard.writeText(content)
    copyState.value = 'copied'
  }
  catch {
    copyState.value = 'failed'
  }

  scheduleCopyStateReset()
}

watch([copyableContent, activeKind], () => {
  resetCopyState()
})

onBeforeUnmount(() => {
  if (copyStateTimer) {
    clearTimeout(copyStateTimer)
  }
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
    <div
      v-if="isEmpty"
      class="px-5 py-1 text-xs text-muted-foreground"
    >
      {{ props.emptyLabel }}
    </div>

    <div
      v-else-if="!displayAssessment.renderable"
      class="space-y-1 px-5 py-1"
    >
      <p class="text-xs text-muted-foreground">
        {{ bodyTooLargeMessage(displayAssessment.byteLength, displayAssessment.limit) }}
      </p>
      <p class="text-[11px] text-muted-foreground/80">
        {{ bodyTooLargeHint(displayAssessment.limit) }}
      </p>
      <p
        v-if="props.truncated"
        class="text-[11px] text-muted-foreground/80"
      >
        抓包数据已超过存储上限，仅保留前段内容。
      </p>
    </div>

    <template v-else>
      <DetailPillNav
        v-model="activeKind"
        :options="pillOptions"
      >
        <template #actions>
          <Button
            v-if="canCopy"
            type="button"
            variant="ghost"
            size="sm"
            class="h-6 gap-1 px-2 text-[10px] text-muted-foreground hover:text-foreground"
            @click="handleCopy"
          >
            <Check v-if="copyState === 'copied'" class="size-3" />
            <Copy v-else class="size-3" />
            <span>{{ copyState === 'copied' ? '已复制' : copyState === 'failed' ? '复制失败' : '复制' }}</span>
          </Button>
        </template>
      </DetailPillNav>

      <p
        v-if="props.truncated"
        class="px-2 py-0.5 text-[10px] text-muted-foreground"
      >
        Body 已截断，仅展示前 {{ formatByteSize(MAX_BODY_STORE_BYTES) }} 内数据。
      </p>

      <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
        <BodyReadonlyEditor
          v-if="showCodeEditor"
          :content="editorContent"
          :language="editorLanguage"
          :show-line-numbers="true"
          :soft-wrap="editorSoftWrap"
          :show-copy="false"
        />

        <BodyFormTable
          v-else-if="activeKind === 'form-urlencoded' || activeKind === 'form-multipart'"
          :rows="formRows"
        />

        <BodyMediaView
          v-else-if="isMediaKind(activeKind)"
          class="flex min-h-0 flex-1 flex-col"
          :bytes="props.bytes!"
          :content-type="props.contentType"
          :kind="activeKind"
        />
      </div>
    </template>
  </div>
</template>
