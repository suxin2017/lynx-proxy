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
        width: 96,
        margin: 1,
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
  <div class="flex min-w-0 items-center gap-2">
    <div
      class="flex size-16 shrink-0 items-center justify-center rounded-sm border border-border bg-background p-0.5"
    >
      <img
        v-if="qrSrc"
        :src="qrSrc"
        :alt="`扫码下载证书 ${props.host}`"
        class="size-full object-contain"
      >
      <span
        v-else-if="qrError"
        class="px-1 text-center text-[10px] leading-tight text-muted-foreground"
      >
        生成失败
      </span>
      <span
        v-else
        class="text-[10px] text-muted-foreground"
      >
        …
      </span>
    </div>

    <div class="min-w-0 space-y-0.5">
      <p class="text-muted-foreground">
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
