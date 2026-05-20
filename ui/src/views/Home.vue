<script setup lang="ts">
import { Button } from '@/components'
import { useCounterStore } from '@/stores'
import { Check } from '@lucide/vue'

const counterStore = useCounterStore()
</script>

<template>
  <div class="flex min-h-[calc(100svh-57px)] items-center justify-center p-6">
    <div class="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-md">
      <div class="mb-6 flex items-center justify-center">
        <Check class="mr-2 h-8 w-8 text-green-500" />
        <h1 class="text-3xl font-bold text-foreground">Welcome</h1>
      </div>

      <p class="mb-8 text-center text-muted-foreground">
        Vue 3 + TypeScript + TailwindCSS + shadcn-vue + Storybook
      </p>

      <div class="mb-6 rounded-md bg-muted p-4 text-center">
        <p class="text-2xl font-bold text-foreground">{{ counterStore.count }}</p>
        <p class="text-sm text-muted-foreground">Counter Value</p>
      </div>

      <div class="flex gap-2 mb-4">
        <Button @click="counterStore.increment" class="flex-1">
          Increment
        </Button>
        <Button @click="counterStore.decrement" variant="outline" class="flex-1">
          Decrement
        </Button>
      </div>

      <Button @click="counterStore.reset" variant="ghost" class="w-full mb-6">
        Reset
      </Button>

      <nav class="flex gap-2">
        <router-link to="/" class="flex-1 text-center text-sm text-blue-500 hover:underline">
          Home
        </router-link>
        <router-link to="/about" class="flex-1 text-center text-sm text-blue-500 hover:underline">
          About
        </router-link>
      </nav>
    </div>
  </div>
</template>
