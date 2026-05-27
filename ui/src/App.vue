<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { AppLayout, type AppLayoutMenuItem } from '@/components'
import { Cctv, Settings } from '@lucide/vue'

const route = useRoute()
const router = useRouter()

const menuItems: AppLayoutMenuItem[] = [
  {
    key: 'network',
    label: 'Network',
    icon: Cctv,
  },
]

const isSettingsRoute = computed(() => route.name === 'Settings')

function goToSettings() {
  void router.push('/settings')
}

const activeKey = computed({
  get: () => (route.name === 'Settings' ? 'settings' : 'network'),
  set: (key: string) => {
    void router.push(key === 'settings' ? '/settings' : '/network')
  },
})

</script>

<template>
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
