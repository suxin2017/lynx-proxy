<script setup lang="ts">
import { SettingsPanel } from '@/components'
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden">
    <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4">
      <div class="mx-auto w-full max-w-3xl">
        <SettingsPanel />
      </div>
    </div>
  </div>
</template>
