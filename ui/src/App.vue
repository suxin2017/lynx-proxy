<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { AppLayout, type AppLayoutMenuItem } from '@/components'
import LoginDialog from '@/components/ui/auth/LoginDialog.vue'
import {
  useAuthStore,
  useCaptureStore,
  useRequestStreamStore,
  useSettingsStore,
  useWsConnectionStore,
} from '@/stores'
import { Braces, Cctv, Settings } from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const wsConnectionStore = useWsConnectionStore()

const menuItems: AppLayoutMenuItem[] = [
  {
    key: 'network',
    label: 'Network',
    icon: Cctv,
  },
  {
    key: 'api-studio',
    label: 'API Studio',
    icon: Braces,
  },
]

const isSettingsRoute = computed(() => route.name === 'Settings')

function goToSettings() {
  void router.push('/settings')
}

const activeKey = computed({
  get: () => {
    if (route.name === 'Settings') return 'settings'
    if (route.name === 'ApiStudio') return 'api-studio'
    return 'network'
  },
  set: (key: string) => {
    if (key === 'settings') void router.push('/settings')
    else if (key === 'api-studio') void router.push('/api-studio')
    else void router.push('/network')
  },
})

async function syncSessionAfterConnect() {
  const captureStore = useCaptureStore()
  captureStore.handleServerEvent()
  await captureStore.refreshStatus()

  const settingsStore = useSettingsStore()
  settingsStore.hydrate()
  if (settingsStore.streamEnabled) {
    const requestStreamStore = useRequestStreamStore()
    await requestStreamStore.start()
    await requestStreamStore.subscribe()
  }
}

async function onLogin(payload: { username: string, password: string }) {
  await authStore.login(payload.username, payload.password)
  await wsConnectionStore.reconnect()
  await syncSessionAfterConnect()
}

</script>

<template>
  <LoginDialog
    :open="authStore.needsLogin"
    :loading="authStore.loading"
    :error="authStore.error"
    @submit="onLogin"
  />

  <div class="h-svh overflow-hidden bg-muted/20">
    <AppLayout v-model="activeKey" :items="menuItems" class="h-full" panel-class="h-full min-h-0">
      <template #sidebar-footer>
        <button
          type="button"
          class="group relative flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-sidebar-foreground/30 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sidebar-ring md:h-9 md:w-9"
          :class="isSettingsRoute
            ? 'text-sidebar-primary'
            : 'hover:text-sidebar-foreground/70'"
          aria-label="Settings"
          title="Settings"
          @click="goToSettings"
        >
          <Settings
            class="h-5 w-5 transition-transform duration-150"
            :class="isSettingsRoute ? 'scale-110' : ''"
          />
        </button>
      </template>

      <template #default>
        <div class="h-full min-h-0">
          <RouterView />
        </div>
      </template>
    </AppLayout>
  </div>
</template>
