<script setup lang="ts">
import { Button } from '@/components'
import { Info } from '@lucide/vue'
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800 p-4">
    <div class="bg-white dark:bg-neutral-900 rounded-lg shadow-lg p-8 max-w-md w-full border border-neutral-200 dark:border-neutral-700">
      <div class="flex items-center justify-center mb-6">
        <Info class="w-8 h-8 tex-nblue-500 mr-2" />
        <h1 class="text-3xl font-bold text-neutral-900 dark:text-white">关于</h1>
      </div>

      <p class="text-center text-neutral-600 dark:text-neutral-400 mb-6">
        这是一个采用行业最佳实践的现代 Vue 3 项目。
      </p>

      <div class="space-y-3 mb-6">
        <div class="flex items-start">
          <span class="text-green-500 mr-2">✓</span>
          <span class="text-sm text-neutral-700 dark:text-neutral-300">Vue 3 + TypeScript</span>
        </div>
        <div class="flex items-start">
          <span class="text-green-500 mr-2">✓</span>
          <span class="text-sm text-neutral-700 dark:text-neutral-300">使用 Vue Router 进行路由导航</span>
        </div>
        <div class="flex items-start">
          <span class="text-green-500 mr-2">✓</span>
          <span class="text-sm text-neutral-700 dark:text-neutral-300">使用 Pinia 进行状态管理</span>
        </div>
        <div class="flex items-start">
          <span class="text-green-500 mr-2">✓</span>
          <span class="text-sm text-neutral-700 dark:text-neutral-300">使用 TailwindCSS v4 进行样式开发</span>
        </div>
        <div class="flex items-start">
          <span class="text-green-500 mr-2">✓</span>
          <span class="text-sm text-neutral-700 dark:text-neutral-300">使用 shadcn-vue 构建组件</span>
        </div>
        <div class="flex items-start">
          <span class="text-green-500 mr-2">✓</span>
          <span class="text-sm text-neutral-700 dark:text-neutral-300">使用 Lucide 图标</span>
        </div>
        <div class="flex items-start">
          <span class="text-green-500 mr-2">✓</span>
          <span class="text-sm text-neutral-700 dark:text-neutral-300">使用 Storybook 进行组件开发</span>
        </div>
      </div>

      <router-link to="/">
        <Button class="w-full">
          返回首页
        </Button>
      </router-link>

      <router-link to="/network" class="mt-2 block">
        <Button class="w-full" variant="outline">
          打开 Network
        </Button>
      </router-link>
    </div>
  </div>
</template>
