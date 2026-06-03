<script setup lang="ts">
import { computed, ref } from 'vue'
import { Lock, User } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<{
  title?: string
  loading?: boolean
  error?: string
  defaultUsername?: string
  /** When true, render only the form (for LoginDialog shell). */
  embedded?: boolean
}>(), {
  title: '登录',
  loading: false,
  error: undefined,
  defaultUsername: '',
  embedded: false,
})

const emit = defineEmits<{
  submit: [payload: { username: string, password: string }]
}>()

const username = ref(props.defaultUsername)
const password = ref('')

const canSubmit = computed(() => {
  return Boolean(username.value.trim()) && Boolean(password.value)
})

function onSubmit() {
  if (props.loading || !canSubmit.value) {
    return
  }
  emit('submit', { username: username.value.trim(), password: password.value })
}

const inputShellClass = cn(
  'flex items-center gap-2.5 rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground',
  'shadow-none outline-none ring-ring transition-colors',
  'hover:border-border/80 focus-within:border-ring/60 focus-within:ring-2 focus-within:ring-ring/25',
)
const inputClass = 'min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground'
</script>

<template>
  <div :class="embedded ? undefined : 'flex min-h-[420px] w-full items-center justify-center p-6'">
    <div
      :class="embedded
        ? 'w-full'
        : 'w-full max-w-[380px] overflow-hidden rounded-xl border border-border/80 bg-card shadow-lg ring-1 ring-border/40'"
    >
      <header
        v-if="!embedded"
        class="border-b border-border/60 px-6 py-5"
      >
        <h1 class="text-base font-semibold tracking-tight text-foreground">
          {{ title }}
        </h1>
        <p class="mt-1 text-xs text-muted-foreground">
          使用代理账号登录以继续
        </p>
      </header>

      <form
        :class="embedded ? 'space-y-4' : 'space-y-4 px-6 py-5'"
        @submit.prevent="onSubmit"
      >
        <label class="grid gap-1.5">
          <span class="sr-only">用户名</span>
          <div :class="inputShellClass">
            <User class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              v-model="username"
              autocomplete="username"
              name="username"
              type="text"
              placeholder="用户名"
              :disabled="loading"
              :class="inputClass"
            >
          </div>
        </label>

        <label class="grid gap-1.5">
          <span class="sr-only">密码</span>
          <div :class="inputShellClass">
            <Lock class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              v-model="password"
              autocomplete="current-password"
              name="password"
              type="password"
              placeholder="密码"
              :disabled="loading"
              :class="inputClass"
            >
          </div>
        </label>

        <p
          v-if="error?.trim()"
          class="rounded-md border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {{ error }}
        </p>

        <Button
          type="submit"
          size="lg"
          class="w-full"
          :disabled="loading || !canSubmit"
        >
          <span :class="cn('transition-opacity', loading ? 'opacity-70' : undefined)">
            {{ loading ? '登录中…' : '登录' }}
          </span>
        </Button>
      </form>
    </div>
  </div>
</template>
