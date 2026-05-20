<script setup lang="ts">
import { Button } from '@/components'
import { Info } from '@lucide/vue'
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800 p-4">
    <div class="bg-white dark:bg-neutral-900 rounded-lg shadow-lg p-8 max-w-md w-full border border-neutral-200 dark:border-neutral-700">
      <div class="flex items-center justify-center mb-6">
        <Info class="w-8 h-8 tex-nblue-500 mr-2" />
        <h1 class="text-3xl font-bold text-neutral-900 dark:text-white">About</h1>
      </div>

      <p class="text-center text-neutral-600 dark:text-neutral-400 mb-6">
        This is a modern Vue 3 project with industry best practices.
      </p>

      <div class="space-y-3 mb-6">
        <div class="flex items-start">
          <span class="text-green-500 mr-2">✓</span>
          <span class="text-sm text-neutral-700 dark:text-neutral-300">Vue 3 + TypeScript</span>
        </div>
        <div class="flex items-start">
          <span class="text-green-500 mr-2">✓</span>
          <span class="text-sm text-neutral-700 dark:text-neutral-300">Vue Router for navigation</span>
        </div>
        <div class="flex items-start">
          <span class="text-green-500 mr-2">✓</span>
          <span class="text-sm text-neutral-700 dark:text-neutral-300">Pinia for state management</span>
        </div>
        <div class="flex items-start">
          <span class="text-green-500 mr-2">✓</span>
          <span class="text-sm text-neutral-700 dark:text-neutral-300">TailwindCSS v4 for styling</span>
        </div>
        <div class="flex items-start">
          <span class="text-green-500 mr-2">✓</span>
          <span class="text-sm text-neutral-700 dark:text-neutral-300">shadcn-vue for components</span>
        </div>
        <div class="flex items-start">
          <span class="text-green-500 mr-2">✓</span>
          <span class="text-sm text-neutral-700 dark:text-neutral-300">Lucide for icons</span>
        </div>
        <div class="flex items-start">
          <span class="text-green-500 mr-2">✓</span>
          <span class="text-sm text-neutral-700 dark:text-neutral-300">Storybook for component development</span>
        </div>
      </div>

      <router-link to="/">
        <Button class="w-full">
          Back to Home
        </Button>
      </router-link>
    </div>
  </div>
</template>
