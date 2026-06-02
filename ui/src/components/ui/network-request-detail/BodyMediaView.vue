<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import type { BodyPreviewKind } from '@/lib/http/body-preview-kind'

const props = defineProps<{
  bytes: Uint8Array
  contentType?: string
  kind: Extract<BodyPreviewKind, 'media-image' | 'media-video' | 'media-font'>
}>()

const mediaUrl = ref<string | undefined>()
const fontReady = ref(false)

let previewFont: FontFace | null = null

function revokeUrl() {
  if (mediaUrl.value) {
    URL.revokeObjectURL(mediaUrl.value)
    mediaUrl.value = undefined
  }
}

async function unloadPreviewFont() {
  fontReady.value = false
  if (previewFont) {
    document.fonts.delete(previewFont)
    previewFont = null
  }
}

async function loadPreviewFont(url: string) {
  await unloadPreviewFont()
  previewFont = new FontFace('LynxPreviewFont', `url(${url})`)
  await previewFont.load()
  document.fonts.add(previewFont)
  fontReady.value = true
}

watch(
  () => [props.bytes, props.contentType, props.kind] as const,
  async () => {
    revokeUrl()
    await unloadPreviewFont()

    const safeBytes = new Uint8Array(props.bytes)
    const blob = new Blob([safeBytes], { type: props.contentType ?? 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    mediaUrl.value = url

    if (props.kind === 'media-font') {
      try {
        await loadPreviewFont(url)
      }
      catch {
        fontReady.value = false
      }
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  void unloadPreviewFont()
  revokeUrl()
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-auto p-2">
    <div
      v-if="props.kind === 'media-font' && fontReady"
      class="rounded-md border border-border/70 bg-background p-4 text-center text-xl"
      style="font-family: LynxPreviewFont, sans-serif"
    >
      <div>A B C D E F G H I J K L M N O P Q R S T U V W X Y Z</div>
      <div class="mt-2 text-base">0123456789</div>
    </div>

    <p
      v-else-if="props.kind === 'media-font'"
      class="px-2 py-1 text-xs text-muted-foreground"
    >
      字体加载失败或格式不受支持
    </p>

    <video
      v-else-if="props.kind === 'media-video' && mediaUrl"
      :src="mediaUrl"
      controls
      class="max-h-full max-w-full rounded-md"
    />

    <img
      v-else-if="mediaUrl"
      :src="mediaUrl"
      alt="preview"
      class="max-h-full max-w-full rounded-md object-contain"
    >
  </div>
</template>
