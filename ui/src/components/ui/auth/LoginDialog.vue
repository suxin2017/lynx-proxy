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
      class="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="登录"
        class="w-full max-w-md"
        @click.stop
      >
        <LoginCard
          :loading="loading"
          :error="error ?? undefined"
          @submit="emit('submit', $event)"
        />
      </div>
    </div>
  </Teleport>
</template>
