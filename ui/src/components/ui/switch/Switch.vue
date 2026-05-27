<script setup lang="ts">
import type { SwitchRootEmits, SwitchRootProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { computed } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import {
  SwitchRoot,
  SwitchThumb,
} from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<
  SwitchRootProps & {
    class?: HTMLAttributes['class']
    /** shadcn-style alias for `modelValue` (reka-ui Switch uses modelValue internally) */
    checked?: boolean
  }
>()

const emits = defineEmits<
  SwitchRootEmits & {
    'update:checked': [value: boolean]
  }
>()

const delegatedProps = reactiveOmit(props, 'class', 'checked', 'modelValue')

const modelValue = computed({
  get() {
    if (props.checked !== undefined) {
      return props.checked
    }
    return props.modelValue ?? false
  },
  set(value: boolean) {
    emits('update:modelValue', value)
    emits('update:checked', value)
  },
})
</script>

<template>
  <SwitchRoot
    v-slot="slotProps"
    v-model="modelValue"
    data-slot="switch"
    v-bind="delegatedProps"
    :class="cn(
      'peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
      props.class,
    )"
  >
    <SwitchThumb
      data-slot="switch-thumb"
      :class="cn('bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0')"
    >
      <slot name="thumb" v-bind="slotProps" />
    </SwitchThumb>
  </SwitchRoot>
</template>
