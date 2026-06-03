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
}>(), {
  title: '登录',
  loading: false,
  error: undefined,
  defaultUsername: '',
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
  'flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground',
  'shadow-none outline-none ring-ring transition-colors hover:border-border focus-within:ring-1',
)
const inputClass = 'min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground'
</script>

<template>
  <div class="flex min-h-[420px] w-full items-center justify-center bg-muted/15 p-6">
    <div class="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
      <h1 class="mb-5 text-xl font-semibold text-foreground">{{ title }}</h1>

      <form class="space-y-3" @submit.prevent="onSubmit">
        <label class="grid gap-1.5">
          <div :class="inputShellClass">
            <User class="h-4 w-4 text-muted-foreground" />
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
          <div :class="inputShellClass">
            <Lock class="h-4 w-4 text-muted-foreground" />
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
          class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {{ error }}
        </p>

        <div class="pt-1">
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
        </div>
      </form>
    </div>
  </div>
</template>

