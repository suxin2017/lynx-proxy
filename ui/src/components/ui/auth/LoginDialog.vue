<script setup lang="ts">
import { computed } from 'vue'
import LoginCard from './LoginCard.vue'

const props = defineProps<{
  open: boolean
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  submit: [payload: { username: string, password: string }]
}>()

const show = computed(() => props.open)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[3px]"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-dialog-title"
        aria-describedby="login-dialog-desc"
        class="w-full max-w-[380px] overflow-hidden rounded-xl border border-border/80 bg-card shadow-2xl ring-1 ring-border/50"
        @click.stop
      >
        <header class="border-b border-border/60 px-6 py-5">
          <h2 id="login-dialog-title" class="text-base font-semibold tracking-tight text-foreground">
            登录
          </h2>
          <p id="login-dialog-desc" class="mt-1 text-xs text-muted-foreground">
            使用代理账号登录以继续
          </p>
        </header>

        <div class="px-6 py-5">
          <LoginCard
            embedded
            :loading="loading"
            :error="error ?? undefined"
            @submit="emit('submit', $event)"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>
