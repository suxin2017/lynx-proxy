<script setup lang="ts">
import { ref, watch } from 'vue'
import { qrCodeToDataUrl } from '@/lib/qr-code'

const props = defineProps<{
  host: string
  url: string
}>()

const qrSrc = ref('')
const qrError = ref(false)

watch(
  () => props.url,
  async (url) => {
    qrSrc.value = ''
    qrError.value = false

    if (!url) {
      return
    }

    try {
      qrSrc.value = await qrCodeToDataUrl(url, {
        width: 256,
        margin: 2,
        errorCorrectionLevel: 'M',
      })
    } catch {
      qrError.value = true
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="flex min-w-0 items-start gap-3">
    <div
      class="flex size-32 shrink-0 items-center justify-center rounded-md border border-border bg-white p-1.5 dark:bg-background"
    >
      <img
        v-if="qrSrc"
        :src="qrSrc"
        :alt="`扫码下载证书 ${props.host}`"
        class="size-full max-h-full max-w-full object-contain"
        width="256"
        height="256"
      >
      <span
        v-else-if="qrError"
        class="px-2 text-center text-[11px] leading-snug text-muted-foreground"
      >
        二维码生成失败
      </span>
      <span
        v-else
        class="text-[11px] text-muted-foreground"
      >
        生成中…
      </span>
    </div>

    <div class="min-w-0 space-y-1 pt-1">
      <p class="text-[11px] text-muted-foreground">
        手机扫码或
        <a
          :href="props.url"
          class="text-primary hover:underline"
          download
        >
          下载证书
        </a>
      </p>
      <p class="truncate font-mono text-[10px] text-muted-foreground">
        {{ props.host }}
      </p>
    </div>
  </div>
</template>
