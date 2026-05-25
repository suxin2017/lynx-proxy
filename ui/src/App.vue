<script setup lang="ts">
import { ref } from 'vue'
import { RouterView } from 'vue-router'
import { AppLayout, type AppLayoutMenuItem } from '@/components'
import { Cctv } from '@lucide/vue'

const menuItems: AppLayoutMenuItem[] = [
  {
    key: 'network',
    label: 'Network',
    icon: Cctv,
  },
  
]

const activeKey = ref('network')
</script>

<template>
  <div class="h-svh bg-muted/20">
    <AppLayout v-model="activeKey" :items="menuItems" class="h-full" panel-class="h-full min-h-0">
      <template #default>
        <div class="h-full min-h-0">
          <RouterView />
        </div>
      </template>
    </AppLayout>
  </div>
</template>
